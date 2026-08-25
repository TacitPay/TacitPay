import { Copy, CopySuccess } from 'iconsax-reactjs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from './ui/button';

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(copiedLabel);
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.');
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? (
        <CopySuccess size={16} variant="Linear" aria-hidden="true" />
      ) : (
        <Copy size={16} variant="Linear" aria-hidden="true" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
