import { useEffect, useState } from 'react';

/**
 * Both licences and the corpus attribution ship here (research R8). The
 * application is Apache-2.0 and bundles CC BY-SA 4.0 content; distributing it
 * without this would be non-compliant, and a poor look for a project whose
 * argument is that the commons should stay common.
 */
export function AboutScreen() {
  const [version, setVersion] = useState<Record<string, unknown> | null>(null);
  const [lic, setLic] = useState<{ code: string; content: string; notice: string } | null>(null);

  useEffect(() => {
    void window.rampa.corpus.version().then(setVersion);
    void window.rampa.corpus.licences().then(setLic);
  }, []);

  return (
    <div className="stack">
      <h1>Acerca de Rampa</h1>
      <p>
        Rampa adapta material de aula al perfil de un alumno con discapacidad.
        Tú revisas y firmas siempre: esto quita el trabajo mecánico, no el criterio.
      </p>

      <h2>Licencias</h2>
      <p className="small muted">
        El programa es Apache-2.0. Las recetas, plantillas y documentación son CC BY-SA 4.0.
        Código permisivo para que un centro pueda integrarlo sin revisión legal; contenido con
        ShareAlike para que lo que construya la comunidad siga siendo de la comunidad.
      </p>
      {version ? (
        <div className="card small">
          <div><strong>Corpus:</strong> {String(version['bundledAt'] ?? '')}</div>
          <div><strong>Atribución:</strong> {String(version['attribution'] ?? '')}</div>
        </div>
      ) : null}
      {lic?.notice ? <details><summary>Aviso de licencias</summary>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{lic.notice}</pre></details> : null}

      <h2>Lo que hace y lo que no</h2>
      <ul>
        <li>Adapta la vía, nunca el contenido: no inventa datos ni cambia lo que enseña la ficha.</li>
        <li>No decide adaptaciones significativas. Eso es del equipo docente y del expediente.</li>
        <li>Un examen adaptado que además es más fácil es otro examen. No lo hace.</li>
        <li>Los nombres de tus alumnos no salen de este ordenador.</li>
      </ul>
    </div>
  );
}
