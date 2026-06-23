const { z } = require('zod');
const authService = require('./auth.service');

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  roles: z.array(z.enum(['attendee', 'organizer', 'admin'])).min(1)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

const profileUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  roles: z.array(z.enum(['attendee', 'organizer', 'admin'])).min(1).optional()
});

const signup = async (req, res, next) => {
  try {
    const validated = signupSchema.parse(req.body);
    const result = await authService.signup(validated);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await authService.login(validated);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const validated = refreshSchema.parse(req.body);
    const result = await authService.refresh(validated);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const result = await authService.getProfile(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const validated = profileUpdateSchema.parse(req.body);
    const result = await authService.updateProfile(req.user.id, validated);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    next(error);
  }
};

module.exports = {
  signup,
  login,
  refresh,
  getProfile,
  updateProfile
};
