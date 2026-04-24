export class AlreadySubscribedError extends Error {
    constructor(public readonly userId: number) {
        super(`User ${userId} already has a subscription that blocks new checkout.`);
        this.name = 'AlreadySubscribedError';
    }
}
