import { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { ModelViewer, type ModelViewerElement } from '@/components/ModelViewer';
import { useSnackbar } from '@/context/SnackbarContext';

const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

export function ARTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const { showMessage } = useSnackbar();
  const modelViewerRef = useRef<ModelViewerElement>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (!chosen) {
      setFile(null);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      return;
    }
    if (!chosen.name.toLowerCase().endsWith('.glb')) {
      showMessage('Bitte eine .glb-Datei wählen.', 'warning');
      setFile(null);
      return;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setFile(chosen);
    setObjectUrl(URL.createObjectURL(chosen));
  };

  const handleArClick = async () => {
    const mv = modelViewerRef.current;
    if (!mv?.activateAR) {
      showMessage('AR wird auf diesem Gerät nicht unterstützt.', 'warning');
      return;
    }
    if (mv.canActivateAR === false) {
      showMessage('AR wird auf diesem Gerät/Browser nicht angeboten.', 'warning');
      return;
    }
    try {
      const result = mv.activateAR();
      if (result && typeof result.then === 'function') {
        await result;
      }
    } catch {
      showMessage(
        'AR konnte nicht gestartet werden. Auf dem iPhone bitte Safari verwenden.',
        'error'
      );
    }
  };

  const handleDownload = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('Download gestartet.', 'success');
  };

  return (
    <Box>
      {!isSecureContext && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          AR funktioniert nur über HTTPS oder localhost. Aktuell keine sichere Verbindung.
        </Alert>
      )}

      <Typography variant="h6" sx={{ mb: 2 }}>
        AR testen (eigenes GLB)
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Laden Sie eine .glb-Datei hoch, um die Anzeige und AR unabhängig von Bynder zu testen.
      </Typography>

      <Button
        variant="outlined"
        component="label"
        startIcon={<UploadFileIcon />}
        sx={{ mb: 2 }}
      >
        GLB-Datei wählen
        <input
          type="file"
          accept=".glb"
          hidden
          onChange={handleFileChange}
        />
      </Button>

      {!objectUrl && (
        <Typography variant="body2" color="text.secondary">
          Keine Datei ausgewählt. Wählen Sie eine .glb-Datei, um die Vorschau und „In AR anzeigen“ zu nutzen.
        </Typography>
      )}

      {objectUrl && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Datei: {file?.name}
          </Typography>
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, overflow: 'hidden', minHeight: 320 }}>
            <ModelViewer
              ref={modelViewerRef}
              glbUrl={objectUrl}
              alt={file?.name ?? '3D model'}
            />
          </Box>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ViewInArIcon />}
              onClick={handleArClick}
            >
              In AR anzeigen
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Modell als GLB herunterladen
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
