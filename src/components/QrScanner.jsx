import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

const QrScanner = ({ onScanSuccess, onScanFailure }) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <Scanner
        onScan={(result) => {
          if (result && result.length > 0) {
            onScanSuccess(result[0].rawValue);
          }
        }}
        onError={(error) => {
          if (onScanFailure) onScanFailure(error);
          console.error("QR Scan Error:", error);
        }}
        formats={['qr_code']}
        constraints={{ facingMode: "environment" }}
      />
    </div>
  );
};

export default QrScanner;
