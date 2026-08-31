export const taskCategories = ['venue', 'catering', 'guests', 'attire', 'decoration', 'photography', 'entertainment', 'transportation', 'invitations', 'ceremony', 'reception', 'finance', 'other'];
export const labelTaskValue = (value) => value.replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
