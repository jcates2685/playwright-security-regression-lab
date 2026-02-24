export type TestUser = {
    label: string;
    email: string;
    password: string;
};

function getPassword(envVarName: string, fallback: string): string {
    return process.env[envVarName] ?? fallback;
}

const DEFAULT_USER_A_PASSWORD = 'test1';
const DEFAULT_USER_B_PASSWORD = 'test2';
const DEFAULT_USER_PW_MUTATOR_PASSWORD = 'test3';

export const USING_DEFAULT_TEST_PASSWORDS =
    getPassword('USER_A_PASSWORD', DEFAULT_USER_A_PASSWORD) === DEFAULT_USER_A_PASSWORD ||
    getPassword('USER_B_PASSWORD', DEFAULT_USER_B_PASSWORD) === DEFAULT_USER_B_PASSWORD ||
    getPassword('USER_PW_MUTATOR_PASSWORD', DEFAULT_USER_PW_MUTATOR_PASSWORD) === DEFAULT_USER_PW_MUTATOR_PASSWORD;

/**
 * These are non-production lab users.
 * Passwords can be overridden with USER_A_PASSWORD / USER_B_PASSWORD / USER_PW_MUTATOR_PASSWORD.
 */
export const USER_A: TestUser = {
    label: 'A',
    email: 'usera@local.test',
    password: getPassword('USER_A_PASSWORD', DEFAULT_USER_A_PASSWORD),
};

export const USER_B: TestUser = {
    label: 'B',
    email: 'userb@local.test',
    password: getPassword('USER_B_PASSWORD', DEFAULT_USER_B_PASSWORD),
};

export const USER_PW_MUTATOR: TestUser = {
    label: 'PW_MUTATOR',
    email: 'pwmutator@local.test',
    password: getPassword('USER_PW_MUTATOR_PASSWORD', DEFAULT_USER_PW_MUTATOR_PASSWORD),
};
