import { useEffect } from 'react';
import { useAsync, useCommand, type Loadable } from './async.js';

/** Her folder. Everything the application knows lives inside it and nowhere else. */
export function useVault(): Loadable<string | null> {
  return useAsync(() => window.rampa.vault.current() as Promise<string | null>, []);
}

export function useDefaultVaultPath(): Loadable<string> {
  return useAsync(() => window.rampa.vault.defaultPath() as Promise<string>, []);
}

export function useChooseVault() {
  return useCommand(() => window.rampa.vault.choose() as Promise<string | null>);
}

export function useUseVault() {
  return useCommand((root: string) => window.rampa.vault.use(root));
}

/**
 * The vault changed underneath her — a sync client landed a file, or she edited
 * a note in a text editor, which she is explicitly allowed to do because the
 * vault is plain Markdown and that is the point.
 */
export function useVaultChanged(onChanged: (path: string) => void): void {
  useEffect(() => window.rampa.vault.onChanged(onChanged), [onChanged]);
}

/** Open a document from the vault in whatever she uses to read Markdown. */
export function useOpenInVault() {
  return useCommand((path: string) => window.rampa.vault.open(path) as Promise<string>);
}

export function useWriteToVault() {
  return useCommand((path: string, content: string) => window.rampa.vault.write(path, content));
}
