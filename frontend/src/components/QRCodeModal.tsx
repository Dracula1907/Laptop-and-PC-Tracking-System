import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Printer, Download } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetCode: string;
  assetTitle: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, assetCode, assetTitle }) => {
  const qrUrl = `${window.location.origin}/assets?search=${assetCode}`;

  const handleDownload = () => {
    const svg = document.getElementById('asset-qr-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_${assetCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = document.getElementById('asset-qr-svg');
    if (!svg) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Asset QR Tag - ${assetCode}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .tag { border: 2px solid #000; padding: 20px; border-radius: 8px; text-align: center; }
            h2 { margin: 10px 0 5px 0; font-size: 18px; }
            p { margin: 0; font-size: 12px; color: #555; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="tag">
            ${svg.outerHTML}
            <h2>${assetCode}</h2>
            <p>${assetTitle}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asset QR Tag Generator" maxWidth="sm">
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className="p-4 bg-white rounded-xl border-4 border-brandPrimary/30 shadow-lg mb-4">
          <QRCodeSVG id="asset-qr-svg" value={qrUrl} size={180} level="H" includeMargin={true} />
        </div>
        <h3 className="text-lg font-bold text-textPrimary tracking-tight">{assetCode}</h3>
        <p className="text-xs text-textSecondary mt-1 max-w-xs">{assetTitle}</p>

        <div className="flex items-center justify-center space-x-3 mt-6 w-full">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleDownload}>
            Download PNG
          </Button>
          <Button variant="primary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print Label
          </Button>
        </div>
      </div>
    </Modal>
  );
};
