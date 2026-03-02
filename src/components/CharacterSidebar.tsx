interface CharacterSidebarProps {
  personagemImagem: string;
  personagemImagemLink: string;
  onPersonagemImagemLinkChange: (value: string) => void;
  onUsarImagemPorLink: () => void;
  onRemoverImagem: () => void;
}

export function CharacterSidebar({
  personagemImagem,
  personagemImagemLink,
  onPersonagemImagemLinkChange,
  onUsarImagemPorLink,
  onRemoverImagem,
}: CharacterSidebarProps) {
  return (
    <div className="info-section">
      <div className="painel personagem-foto-painel">
        <h2 className="panel-title">
          <i className="fas fa-image"></i> Retrato do Personagem
        </h2>

        <div className="personagem-foto-box">
          {personagemImagem ? (
            <img
              src={personagemImagem}
              alt="Retrato do personagem"
              className="personagem-foto-img"
            />
          ) : (
            <div className="personagem-foto-placeholder">Sem imagem</div>
          )}
        </div>

        <div className="personagem-foto-acoes">
          <button
            type="button"
            className="personagem-foto-btn personagem-foto-remover"
            onClick={onRemoverImagem}
            disabled={!personagemImagem}
          >
            <i className="fas fa-trash"></i> Remover
          </button>
        </div>
        <div className="personagem-foto-link">
          <input
            type="url"
            value={personagemImagemLink}
            onChange={(e) => onPersonagemImagemLinkChange(e.target.value)}
            placeholder="Cole um link de imagem (https://...)"
          />
          <button
            type="button"
            className="personagem-foto-btn"
            onClick={onUsarImagemPorLink}
          >
            Usar link
          </button>
        </div>
      </div>
      <div className="painel">
        <h2 className="panel-title">
          <i className="fas fa-handshake"></i> Afinidade (Carisma)
        </h2>
        <table className="panel-table">
          <thead>
            <tr>
              <th>Pontos de Carisma</th>
              <th>Afinidade</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>8-10</td>
              <td>3</td>
            </tr>
            <tr>
              <td>11-14</td>
              <td>4</td>
            </tr>
            <tr>
              <td>15-18</td>
              <td>5</td>
            </tr>
            <tr>
              <td>19-20</td>
              <td>6</td>
            </tr>
            <tr>
              <td>23-26</td>
              <td>7</td>
            </tr>
            <tr>
              <td>27-30</td>
              <td>8</td>
            </tr>
            <tr>
              <td>31-40</td>
              <td>11</td>
            </tr>
            <tr>
              <td>41-48</td>
              <td>12</td>
            </tr>
            <tr>
              <td>49-57</td>
              <td>14</td>
            </tr>
            <tr>
              <td>58-67</td>
              <td>18</td>
            </tr>
            <tr>
              <td>68-79</td>
              <td>20</td>
            </tr>
            <tr>
              <td>80-90</td>
              <td>22</td>
            </tr>
            <tr>
              <td>91-100</td>
              <td>26</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-600">
          Espaço de artefatos: 1º:1, 2º:3, 3º:4, 4º:7, 5º:11
        </p>
      </div>
    </div>
  );
}
