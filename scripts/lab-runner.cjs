const { spawnSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Configuration
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
const BASE_URL = process.env.LAB_BASE_URL || 'http://127.0.0.1:3000';
const HEALTHCHECK_TIMEOUT_SECONDS = 60;
const HEALTHCHECK_POLL_INTERVAL_MS = 2000;

// Paths
const repoRoot = path.resolve(__dirname, '..');
const composeFile = path.join(repoRoot, 'env', 'docker-compose.yml');
const playwrightPackageJson = require.resolve('playwright/package.json', { paths: [repoRoot] });
const localPlaywrightEntry = path.join(path.dirname(playwrightPackageJson), 'cli.js');
const cleanupPaths = ['.auth', 'playwright-report', 'test-results'];

// Execute a command synchronously and exit with its status code if non-zero.
// All output is inherited (shown to user), which provides full visibility into command execution.
function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: false,
        ...options,
    });

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

// Execute docker compose with the configured compose file.
// Wraps the run() function to apply consistent docker compose configuration.
function dockerCompose(args) {
    run('docker', ['compose', '-f', composeFile, ...args]);
}

// Sleep for a given number of milliseconds using native OS commands.
// Prefers non-blocking OS sleep (timeout on Windows, sleep on Unix) over busy-wait.
// Falls back to busy-wait only if the OS command is unavailable or fails.
function sleep(ms) {
    const seconds = Math.ceil(ms / 1000);
    try {
        if (process.platform === 'win32') {
            // Windows: use timeout command
            execSync(`timeout /t ${seconds} /nobreak`, { stdio: 'ignore' });
        } else {
            // Unix-like: use sleep command
            execSync(`sleep ${seconds}`, { stdio: 'ignore' });
        }
    } catch {
        // Fallback: simple busy wait if native command fails
        const start = Date.now();
        while (Date.now() - start < ms) {
            // Fallback busy wait
        }
    }
}

// Poll the LAB_BASE_URL endpoint until it responds or timeout is exceeded.
// This ensures the application server is fully ready before tests start.
// Returns true if server becomes ready, false if timeout is reached.
function waitForServices(timeoutSeconds = HEALTHCHECK_TIMEOUT_SECONDS) {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let attemptCount = 0;

    if (DEBUG) {
        console.log(`[DEBUG] Waiting for services at ${BASE_URL}...`);
    }

    while (Date.now() - startTime < timeoutMs) {
        attemptCount++;

        // Check if server is responding via HTTP
        const result = spawnSync('curl', ['--silent', '--fail', '--max-time', '5', BASE_URL], {
            cwd: repoRoot,
            stdio: 'pipe',
            encoding: 'utf-8',
        });

        if (result.status === 0) {
            if (DEBUG) {
                console.log(`[DEBUG] Attempt ${attemptCount}: Server is responding!`);
            }
            console.log('✓ All services are healthy and running.');
            return true;
        } else if (DEBUG) {
            console.log(`[DEBUG] Attempt ${attemptCount}: Server not responding (curl exit code: ${result.status})`);
        }

        // Wait before checking again
        const remainingTime = timeoutMs - (Date.now() - startTime);
        if (remainingTime > HEALTHCHECK_POLL_INTERVAL_MS) {
            sleep(HEALTHCHECK_POLL_INTERVAL_MS);
        } else if (remainingTime > 0) {
            sleep(remainingTime);
        }
    }

    console.error('✗ Timeout waiting for services to be healthy after ' + timeoutSeconds + ' seconds.');
    console.error('  Run this to check logs: docker compose -f ' + composeFile + ' logs');
    console.error('  Try manually: curl ' + BASE_URL);
    return false;
}

// Delete test artifacts from the repository root.
// Validates that target paths stay within the repo to prevent accidental deletion of unrelated files.
function removeArtifacts() {
    for (const relativePath of cleanupPaths) {
        const targetPath = path.resolve(repoRoot, relativePath);
        const relativeTargetPath = path.relative(repoRoot, targetPath);

        if (relativeTargetPath.startsWith('..') || path.isAbsolute(relativeTargetPath)) {
            throw new Error(`Refusing to remove path outside repo root: ${targetPath}`);
        }

        fs.rmSync(targetPath, {
            force: true,
            recursive: true,
        });
    }
}

// Clean up lab: tear down containers, remove test artifacts, and start a fresh environment.
// Waits for services to become healthy before returning.
function freshLab() {
    dockerCompose(['down', '-v', '--remove-orphans']);
    removeArtifacts();
    dockerCompose(['up', '-d', '--force-recreate']);

    if (!waitForServices()) {
        process.exit(1);
    }
}

// Run the Playwright test suite with optional configuration arguments.
// Critically, sets LAB_BASE_URL so tests can connect to the correct server endpoint.
function runPlaywright(extraArgs) {
    const cmd = process.execPath;
    const args = [localPlaywrightEntry, 'test', ...extraArgs];

    if (DEBUG) {
        console.log(`[DEBUG] Starting Playwright tests...`);
        console.log(`[DEBUG] Command: ${cmd} ${args.join(' ')}`);
        console.log(`[DEBUG] Base URL: ${BASE_URL}`);
        console.log(`[DEBUG] Working directory: ${repoRoot}`);
    }

    console.log('\n▶ Running test suite against ' + BASE_URL);
    const result = spawnSync(cmd, args, {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: false,
        env: {
            ...process.env,
            LAB_BASE_URL: BASE_URL,
        },
    });

    if (result.status !== 0) {
        console.error('\n✗ Tests failed or did not complete.');
        if (result.error) {
            console.error('Error details:', result.error.message);
        }
        process.exit(result.status ?? 1);
    }

    console.log('\n✓ Tests completed successfully.');
}

// Set up fresh lab, run the full test suite, and tear down afterward.
// Always cleans up the lab in the finally block to avoid leaving containers running.
function freshTest(extraArgs) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║          FRESH LAB SETUP & TEST EXECUTION              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    freshLab();
    console.log('\n✓ Lab environment is ready.\n');

    try {
        runPlaywright(extraArgs);
    } catch (error) {
        console.error('\n✗ Test execution failed:', error);
        process.exit(1);
    } finally {
        console.log('\n▼ Tearing down lab environment...');
        dockerCompose(['down', '-v', '--remove-orphans']);
        console.log('✓ Lab environment cleaned up.\n');
    }
}

// Parse command-line arguments and route to appropriate handler
const [, , command, ...args] = process.argv;

switch (command) {
    case 'fresh':
        freshLab();
        break;
    case 'clean':
        removeArtifacts();
        break;
    case 'test':
        freshTest(args);
        break;
    default:
        console.error('Usage: node scripts/lab-runner.cjs <fresh|clean|test> [playwright args]');
        process.exit(1);
}
