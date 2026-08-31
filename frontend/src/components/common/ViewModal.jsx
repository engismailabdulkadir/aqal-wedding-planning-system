import Modal from './Modal.jsx';
import ModalFooter, { ModalCancelButton } from './ModalFooter.jsx';

export default function ViewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  closeLabel = 'Close',
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={(
        <ModalFooter>
          <ModalCancelButton onClick={onClose}>{closeLabel}</ModalCancelButton>
        </ModalFooter>
      )}
    >
      {children}
    </Modal>
  );
}
