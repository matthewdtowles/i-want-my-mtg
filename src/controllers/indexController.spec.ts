import express from 'express';
import request from 'supertest';
import { ConfigService } from '../services/configService';
import { SetService } from '../services/setService';
import router from './indexController';

// Mock ConfigService and SetService
jest.mock('../services/configService');
jest.mock('../services/setService');

describe('Your Router', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks(); // Reset mock implementations between tests
    app = express();
    app.use('/', router);
  });

  it('responds with index page', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('index');
    // Add more assertions if needed
  });

  it('responds with set data for a valid set code', async () => {
    // (SetService as jest.MockedClass<typeof SetService>).prototype.requestSet.mockResolvedValueOnce({
    //   // cards: [{ /* Sample card data */ }],
    // });

    const response = await request(app).get('/sets/KLD');
    expect(response.status).toBe(200);
    expect(response.text).toContain('KLD');
    // Add more assertions based on your expected response
  });

  it('responds with error page for an invalid set code', async () => {
    (SetService as jest.MockedClass<typeof SetService>).prototype.requestSet.mockRejectedValueOnce(new Error('Set not found'));

    const response = await request(app).get('/sets/invalid-set-code');
    expect(response.status).toBe(500); // Check for the appropriate status code
    expect(response.text).toContain('error'); // Check if error page is rendered
    // Add more assertions based on your error handling
  });
});
