const express = require('express');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Path where the Vault Agent Injector writes the rendered secret.
// See the `vault.hashicorp.com/agent-inject-template-*` annotations
// in k8s/deployment.yaml
const VAULT_SECRET_PATH = process.env.VAULT_SECRET_PATH || '/vault/secrets/db-config';

/**
 * Read a key/value secret rendered by the Vault Agent into a file.
 * The template renders lines in the form `KEY=value`.
 */
function readVaultSecret() {
    try {
        const raw = fs.readFileSync(VAULT_SECRET_PATH, 'utf8');
        const secret = {};
        for (const line of raw.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.includes('=')) continue;
            const idx = trimmed.indexOf('=');
            const key = trimmed.slice(0, idx).trim();
            const value = trimmed.slice(idx + 1).trim();
            secret[key] = value;
        }
        return secret;
    } catch (err) {
        return null;
    }
}

app.get('/', (req, res) => {
    res.json({ status: 'alive', message: 'Vault Secret Management Workshop' });
});

// Liveness/Readiness probe target
app.get('/healthz', (req, res) => {
    res.json({ status: 'ok' });
});

// Returns whether the secret was successfully loaded from Vault,
// WITHOUT exposing the password value itself.
app.get('/secret/status', (req, res) => {
    const secret = readVaultSecret();
    if (!secret) {
        return res.status(503).json({
            loaded: false,
            source: VAULT_SECRET_PATH,
            message: 'Secret not available yet. Is the Vault Agent sidecar injected?',
        });
    }
    res.json({
        loaded: true,
        source: VAULT_SECRET_PATH,
        keys: Object.keys(secret),
        // Mask the password – never return it in plain text.
        DB_PASSWORD: secret.DB_PASSWORD ? '********' : undefined,
    });
});

// Demo endpoint: uses the password to "connect" to a database.
// The real password stays server-side and is never returned to the client.
app.get('/db/connect', (req, res) => {
    const secret = readVaultSecret();
    if (!secret || !secret.DB_PASSWORD) {
        return res.status(503).json({
            connected: false,
            message: 'DB_PASSWORD not available from Vault.',
        });
    }

    const masked = secret.DB_PASSWORD.replace(/./g, '*');
    console.log(`Connecting to ${secret.DB_HOST || 'db'} as ${secret.DB_USER || 'app'} with password ${masked}`);

    res.json({
        connected: true,
        host: secret.DB_HOST || null,
        user: secret.DB_USER || null,
        message: 'Successfully read password from HashiCorp Vault and connected.',
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Reading Vault secret from: ${VAULT_SECRET_PATH}`);
});
