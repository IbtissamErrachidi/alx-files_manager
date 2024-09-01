export const errors = {
  404: 'Not found',
  401: 'Unauthorized',
  500: 'Internal Server Error',
};

/**
 * Send a unified express response with a given code
 *
 * @param {number} code
 * @param {import('express').Response} response
 */
export function sendStatus(code, response) {
  response.status(code).json({ error: errors[code] });
}
