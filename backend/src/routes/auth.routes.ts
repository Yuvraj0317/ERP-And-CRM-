import { Router } from 'express';
import { loginUser, getMe, getAllUsers } from '../services/auth.service';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    const result = await loginUser(email, password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.get('/users', authenticate, async (req, res, next) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

export default router;
