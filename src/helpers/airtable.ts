export function escapeAirtableString(value: string) {
    return value.replace(/'/g, "\\'")
}
