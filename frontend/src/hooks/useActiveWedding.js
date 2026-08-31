import { useContext } from 'react'; import { ActiveWeddingContext } from '../context/ActiveWeddingContext.jsx';
export function useActiveWedding(){const context=useContext(ActiveWeddingContext);if(!context)throw new Error('useActiveWedding must be used inside ActiveWeddingProvider');return context;}
