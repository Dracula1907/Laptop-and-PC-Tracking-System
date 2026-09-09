import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Printer, Download, ExternalLink, ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetCode: string;
  assetTitle: string;
  assetId?: string;
  qrToken?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  assetCode,
  assetTitle,
  assetId,
  qrToken,
}) => {
  const navigate = useNavigate();
  // If a secure gate QR token exists use it, otherwise use asset verification URL
  const qrValue = qrToken || `${window.location.origin}/assets?search=${encodeURIComponent(assetCode)}`;

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
            @media print {
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #fff;
            }
            .tag {
              border: 2px solid #000;
              padding: 16px 20px;
              border-radius: 10px;
              text-align: center;
              width: 220px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .org {
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 1.5px;
              color: #111;
              margin-bottom: 2px;
            }
            .sub {
              font-size: 8px;
              font-weight: 700;
              letter-spacing: 0.8px;
              color: #555;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .code {
              margin: 8px 0 2px 0;
              font-size: 15px;
              font-weight: 800;
              font-family: monospace;
              letter-spacing: 0.5px;
            }
            .name {
              margin: 0;
              font-size: 11px;
              color: #444;
              max-width: 200px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="tag">
            <div class="org">FAITH AUTOMATION</div>
            <div class="sub">IT Asset Tracking Tag</div>
            ${svg.outerHTML}
            <div class="code">${assetCode}</div>
            <p class="name">${assetTitle}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asset QR Tag Generator" maxWidth="sm">
      <div className="flex flex-col items-center justify-center p-4 text-center">
        {/* Physical Badge Preview */}
        <div className="p-4 bg-white rounded-xl border-2 border-[#313C4A] shadow-xl mb-4 flex flex-col items-center w-60">
          <span className="text-[10px] font-black tracking-widest text-slate-900 mb-0.5">
            FAITH AUTOMATION
          </span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            IT Asset Tracking Tag
          </span>
          <div className="p-1 bg-white rounded-lg">
            <QRCodeSVG id="asset-qr-svg" value={qrValue} size={160} level="H" includeMargin={false} />
          </div>
          <h3 className="text-sm font-black font-mono text-slate-950 mt-2 tracking-tight">
            {assetCode}
          </h3>
          <p className="text-[11px] text-slate-600 font-medium truncate max-w-[200px] mt-0.5">
            {assetTitle}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full mt-2">
          <div className="flex items-center justify-center space-x-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownload}
              className="flex-1"
            >
              Download PNG
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
            >
              Print Tag
            </Button>
          </div>

          {assetId && (
            <button
              onClick={() => {
                onClose();
                navigate(`/assets/${assetId}`);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1.5 py-1.5 transition-colors font-medium"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Open in Security Gate & Tag History</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
