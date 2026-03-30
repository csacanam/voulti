// Function to interpolate variables in translation strings
// Example: interpolate("You need {required} {symbol}", { required: "100", symbol: "USDC" })
// Result: "You need 100 USDC"
export const interpolate = (template: string | undefined, variables: Record<string, string | number>): string => {
  // Protect against undefined template
  if (!template || typeof template !== 'string') {
    console.warn('interpolate: template is undefined or not a string:', template);
    return '';
  }
  
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key]?.toString() || match;
  });
};

// Function to safely access nested properties
// Example: getNestedProperty(t, "balance.insufficient") 
export const getNestedProperty = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}; 