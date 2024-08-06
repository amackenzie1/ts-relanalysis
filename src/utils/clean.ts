export const clean = (data: string): string => {
    // remove all urls 
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const cleanedData = data.replace(urlRegex, '');
    return cleanedData;
}