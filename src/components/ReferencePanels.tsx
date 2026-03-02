export function ReferencePanels() {
  return (
    <>
      <div className="painel">
        <h2 className="panel-title">
          <i className="fas fa-dragon"></i> Tabela de classes
        </h2>
        <table className="panel-table">
          <thead>
            <tr>
              <th>Classe</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Variante</td>
              <td>1</td>
            </tr>
            <tr>
              <td>Feiticeiro</td>
              <td>2</td>
            </tr>
            <tr>
              <td>Santo vivo</td>
              <td>3</td>
            </tr>
            <tr>
              <td>Mago</td>
              <td>4-6</td>
            </tr>
            <tr>
              <td>Paladino</td>
              <td>7-8</td>
            </tr>
            <tr>
              <td>Bruxa</td>
              <td>9-10</td>
            </tr>
            <tr>
              <td>Guerreiro</td>
              <td>10-100</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-600">
          Classes mágicas têm progressão própria.
        </p>
      </div>

      <div className="painel regras">
        <h2 className="panel-title">
          <i className="fas fa-fist-raised"></i> Combate: A Trindade
        </h2>
        <p>
          <strong>1ª Ação:</strong> Sacar 1 carta (acerto = sucesso).
        </p>
        <p>
          <strong>2ª Ação:</strong> Sacar 2 cartas (priorizar erro: qualquer
          erro anula).
        </p>
        <p>
          <strong>3ª Ação:</strong> Sacar 3 cartas (priorizar erro).
        </p>
        <p>
          <strong>Esquiva:</strong> d100: 1ª total, 2ª metade, 3ª quarto.
        </p>
        <p>
          <strong>Mitigação:</strong> usar ação para movimento/interação sem
          teste.
        </p>
        <p>
          <strong>Iniciativa:</strong> saque do deck de Destreza.
        </p>
      </div>

      <div className="painel regras">
        <h2 className="panel-title">
          <i className="fas fa-hourglass-half"></i> Horizonte de Eventos
        </h2>
        <p>O tempo é recurso. Mestre define custo antes do teste.</p>
        <p>
          <strong>Pressa:</strong> metade do tempo, penalidade (priorizar erro
          ou -50% perícia).
        </p>
        <p>
          <strong>Cuidado:</strong> dobro do tempo, vantagem.
        </p>
        <p>Falha: tempo passa, nova tentativa custa mais.</p>
      </div>
    </>
  );
}
