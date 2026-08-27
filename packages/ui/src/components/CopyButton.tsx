import { Copy, CopySuccess } from 'iconsax-reactjs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from './ui/button';

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  iconOnly = false,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  /** Drop the visible word for tight rows; the label survives as aria/title. */
  iconOnly?: boolean;
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
    <Button
      type="button"
      // Icon-only sheds the box too: a bare glyph that fills in on hover —
      // three bordered squares in a row read as furniture, not actions.
      variant={iconOnly ? 'ghost' : 'outline'}
      size="sm"
      onClick={copy}
      aria-label={iconOnly ? (copied ? copiedLabel : label) : undefined}
      title={iconOnly ? label : undefined}
      className={iconOnly ? 'size-8 p-0 text-muted-foreground hover:text-foreground' : undefined}
    >
      {copied ? (
        <CopySuccess size={16} variant="Linear" aria-hidden="true" />
      ) : (
        <Copy size={16} variant="Linear" aria-hidden="true" />
      )}
      {iconOnly ? null : copied ? copiedLabel : label}
    </Button>
  );
}
