import { Router } from 'express';
import {
  addCartItem,
  checkoutCart,
  getHallSlotAvailability,
  listCartItems,
  removeCartItem,
  updateCartItem,
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

const router = Router();
router.use(protect);
router.get('/hall-slots', getHallSlotAvailability);
router.get('/', listCartItems);
router.post('/items', addCartItem);
router.patch('/items/:id', validateObjectId(), updateCartItem);
router.delete('/items/:id', validateObjectId(), removeCartItem);
router.post('/checkout', checkoutCart);

export default router;
