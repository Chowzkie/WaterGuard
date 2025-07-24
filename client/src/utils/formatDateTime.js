
export function formatDateTime(dateString) {
    const date = new Date(dateString);
    const options = { month: 'long' }; // Full month name like "July"
    const month = new Intl.DateTimeFormat('en-US', options).format(date);
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
}
