import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RenamePlaylistModalProps {
  renamingId: string | null;
  newName: string;
  setNewName: (name: string) => void;
  isRenaming: boolean;
  onRename: () => void;
  onCancel: () => void;
}

export function RenamePlaylistModal({
  renamingId,
  newName,
  setNewName,
  isRenaming,
  onRename,
  onCancel,
}: RenamePlaylistModalProps) {
  return (
    <AnimatePresence>
      {renamingId && (
        <div className='fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm shadow-2xl'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className='w-full max-w-md bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl'
          >
            <h2 className='text-2xl font-bold text-foreground mb-2'>
              Rename Playlist
            </h2>
            <p className='text-muted-foreground text-sm mb-6 font-light'>
              Give your collection a new name that resonates with you.
            </p>

            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder='Playlist name'
              className='h-12 rounded-2xl bg-muted/50 border-border mb-8 focus-visible:ring-primary/50 text-foreground placeholder:text-muted-foreground font-light'
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRename();
                if (e.key === 'Escape') onCancel();
              }}
            />

            <div className='flex items-center gap-3'>
              <Button
                variant='ghost'
                className='flex-1 h-12 rounded-2xl text-muted-foreground border border-transparent hover:border-border'
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                className='flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98]'
                onClick={onRename}
                disabled={isRenaming || !newName.trim()}
              >
                {isRenaming ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
