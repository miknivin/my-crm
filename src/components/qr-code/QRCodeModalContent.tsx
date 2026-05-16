// components/QRCodeModalContent.tsx
import QRCode from "react-qr-code"; // Assuming react-qr-code is used

// Define the interface for the contact prop
interface Contact {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  probability?: number;
}


// Define the props interface for the component
interface QRCodeModalContentProps {
  contact: Contact;
  onClose: () => void;
}

const QRCodeModalContent: React.FC<QRCodeModalContentProps> = ({ contact, onClose }) => {
  return (
    <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
      <div>
        <h5 className="mb-4 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
          Scan to Call {contact.name || "Contact"}
        </h5>
      </div>
      <div className="flex justify-center mb-6">
        <QRCode value={`tel:${contact.phone}`} size={300} />
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
      >
        Close
      </button>
    </div>
  );
};

export default QRCodeModalContent;