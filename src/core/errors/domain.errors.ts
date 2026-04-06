export class DomainNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DomainNotFoundError';
    }
}

export class DomainNotAuthorizedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DomainNotAuthorizedError';
    }
}

export class DomainValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DomainValidationError';
    }
}
