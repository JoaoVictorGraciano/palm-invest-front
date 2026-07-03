import { RouterProvider } from 'react-router-dom';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { router } from '@/routes';

function App() {
  return (
    <>
      <button
        id="debug-toast-btn"
        style={{ position: 'fixed', bottom: 8, right: 8, zIndex: 9999 }}
        onClick={() => toast.success('Teste de toast')}
      >
        debug toast
      </button>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
