export function redactEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const visibleChars = Math.min(2, local.length);
    return `${local.substring(0, visibleChars)}***@${domain}`;
}
