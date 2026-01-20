const modalStyles = (
  <style>{`
    .modalOverlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
    }

    .modal {
      width: 420px;
      max-height: 90vh;
      overflow-y: auto;
      background: #0c0c0c;
      border-radius: 16px;
      padding: 16px;
      border: 1px solid rgba(255,255,255,0.08);
    }

    .modalHeader {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .modalHeader button {
      margin-left: auto;
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
    }

    .dropZone {
      border: 1px dashed rgba(255,255,255,0.2);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 16px;
    }

    .dropZone.active {
      background: rgba(255,255,255,0.05);
    }

    .browseBtn {
      margin-top: 8px;
      display: inline-block;
      padding: 6px 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      cursor: pointer;
    }

    .field, .section {
      margin-bottom: 14px;
    }

    input {
      width: 100%;
      padding: 8px;
      background: #111;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      color: #fff;
    }

    .sectionHeader {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 6px;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 12px;
    }

    .modalFooter {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .modalFooter.space {
      justify-content: space-between;
    }

    .primary {
      background: #4f8cff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
    }

    .danger {
      background: #3a0f0f;
      color: #ff3b30;
      border: 1px solid #ff3b30;
      padding: 8px 14px;
      border-radius: 8px;
    }

    .filePreview {
      font-size: 48px;
      text-align: center;
      margin-bottom: 16px;
    }
  `}</style>
);
export { modalStyles };