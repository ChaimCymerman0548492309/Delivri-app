import express from 'express';
import type { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 8200;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Server running (TypeScript)');
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

