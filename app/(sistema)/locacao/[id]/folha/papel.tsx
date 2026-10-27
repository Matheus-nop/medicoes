import { emReais } from "@/lib/medicoes/dinheiro";
import {
  cobravel,
  linhasDaManutencao,
  posicoesDoBoletim,
  totalLido,
  type BaseDaPlanilha,
} from "@/lib/medicoes/locacao";
import type { CargaDaMedicao } from "../../dados";
import { diaMes, mesPorExtenso } from "../../formato";

/**
 * A medição de locação no papel da casa: o que a planilha da AEGEA diz, lido
 * como gente lê. A faixa azul com o mês e os números, o resumo por município
 * (que é como a AEGEA contabiliza) e, base a base, os equipamentos em
 * posições — a troca dentro da posição, com quem saiu e quem entrou. A
 * manutenção do mês fecha o total.
 *
 * As cores são do papel, não os tokens do sistema: sai igual no tema claro e
 * no escuro, como o relatório de manutenção.
 */

const AZUL = "#253F93";

const base = (b: Extract<CargaDaMedicao, { ok: true }>["boletins"][number]["base"]): BaseDaPlanilha | null =>
  b
    ? {
        nome: b.nome,
        projeto: b.projeto ?? null,
        municipio: b.municipio ?? null,
        superintendencia: b.superintendencia ?? null,
        bloco: b.bloco ?? null,
        coordenador: b.coordenador ?? null,
      }
    : null;

function Numero({ rotulo, valor, detalhe, forte }: { rotulo: string; valor: string; detalhe?: string; forte?: boolean }) {
  return (
    <div className={`rounded-[2.5mm] px-[4mm] py-[2.5mm] ${forte ? "bg-[#EEF2FB]" : "border border-[#DCE1EC]"}`}>
      <p className={`text-[6.5pt] font-semibold tracking-[0.08em] uppercase ${forte ? "text-[#253F93]" : "text-[#7A8294]"}`}>{rotulo}</p>
      <p className={`text-[13pt] leading-tight font-bold tabular-nums ${forte ? "text-[#253F93]" : ""}`}>{valor}</p>
      {detalhe && <p className="text-[7pt] text-[#4A5368]">{detalhe}</p>}
    </div>
  );
}

function Dado({ rotulo, children, largo, falta }: { rotulo: string; children: React.ReactNode; largo?: boolean; falta?: boolean }) {
  return (
    <div className={largo ? "col-span-2" : ""}>
      <p className="text-[6.5pt] font-semibold tracking-[0.08em] text-[#7A8294] uppercase">{rotulo}</p>
      <p className={`mt-[0.4mm] text-[8pt] leading-snug font-medium ${falta ? "text-[#B4232A]" : "text-[#141B2D]"}`}>{children}</p>
    </div>
  );
}

function Titulo({ numero, children }: { numero: string; children: React.ReactNode }) {
  return (
    <div className="mt-[5mm] mb-[2mm] flex items-center gap-[2.5mm] break-after-avoid">
      <span className="grid size-[5.5mm] place-items-center rounded-full bg-[#253F93] text-[7pt] font-bold text-white">{numero}</span>
      <h2 className="text-[9.5pt] font-bold tracking-tight text-[#253F93]">{children}</h2>
      <span className="h-px flex-1 bg-[#DCE1EC]" />
    </div>
  );
}

export function PapelDaLocacao({ carga, emitidoPor }: { carga: Extract<CargaDaMedicao, { ok: true }>; emitidoPor: string }) {
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const { medicao: m, boletins, itens, manutencao } = carga;
  const ultimo = new Date(Date.UTC(+m.mes.slice(0, 4), +m.mes.slice(5, 7), 0)).toISOString().slice(0, 10);

  const bases = [...boletins]
    .sort(
      (a, b) =>
        (a.base?.bloco ?? "").localeCompare(b.base?.bloco ?? "") ||
        (a.base?.municipio ?? "").localeCompare(b.base?.municipio ?? "") ||
        a.base_nome.localeCompare(b.base_nome),
    )
    .map((b) => {
      const seus = itens.filter((i) => i.boletim_id === b.id);
      const posicoes = posicoesDoBoletim(seus);
      return { b, base: base(b.base), posicoes, cobrados: seus.filter(cobravel).length, valor: totalLido(seus) };
    });
  const locacao = bases.reduce((t, x) => t + x.valor, 0);
  const posicoes = bases.reduce((t, x) => t + x.posicoes.length, 0);
  const cobrados = bases.reduce((t, x) => t + x.cobrados, 0);
  const trocas = bases.reduce((t, x) => t + x.posicoes.filter((p) => p.itens.length > 1).length, 0);
  const linhasManut = linhasDaManutencao(
    manutencao.map((x) => ({ valor: x.valor, base: base(x.base) })),
    m.mes,
    ultimo,
  );
  const valorManut = linhasManut.reduce((t, l) => t + l.valor_total, 0);

  // O resumo como a AEGEA contabiliza: município, superintendência, bloco.
  const resumo = new Map<string, { municipio: string; superintendencia: string; bloco: string; bases: number; posicoes: number; locacao: number; manutencao: number }>();
  const chave = (b: BaseDaPlanilha | null) => [b?.municipio ?? "", b?.superintendencia ?? "", b?.bloco ?? ""].join("|");
  const linhaDo = (b: BaseDaPlanilha | null) => {
    const k = chave(b);
    const r = resumo.get(k) ?? {
      municipio: b?.municipio ?? "—",
      superintendencia: b?.superintendencia ?? "—",
      bloco: b?.bloco ?? "—",
      bases: 0,
      posicoes: 0,
      locacao: 0,
      manutencao: 0,
    };
    resumo.set(k, r);
    return r;
  };
  for (const x of bases) {
    const r = linhaDo(x.base);
    r.bases += 1;
    r.posicoes += x.posicoes.length;
    r.locacao += x.valor;
  }
  for (const l of linhasManut) {
    linhaDo({ nome: "", projeto: l.projeto, municipio: l.cidade || null, superintendencia: l.superintendencia || null, bloco: l.bloco || null, coordenador: null }).manutencao += l.valor_total;
  }
  const resumoOrdenado = [...resumo.values()].sort(
    (a, b) => a.bloco.localeCompare(b.bloco) || a.municipio.localeCompare(b.municipio) || a.superintendencia.localeCompare(b.superintendencia),
  );

  const th = "px-[1.5mm] py-[1.3mm] text-left text-[6.5pt] font-semibold tracking-[0.06em] uppercase";
  const td = "px-[1.5mm] py-[0.9mm] border-b border-[#E9ECF2]";

  return (
    <div
      id="folha"
      className="mx-auto w-[190mm] min-w-[190mm] bg-white font-sans text-[8pt] text-[#141B2D] shadow-xl [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:shadow-none"
    >
      <header className="rounded-b-[3mm] px-[8mm] pt-[6mm] pb-[5mm] text-white" style={{ background: AZUL }}>
        <div className="flex items-start justify-between">
          <p className="text-[8pt] font-bold tracking-[0.18em]">NOVA OPÇÃO</p>
          <p className="text-right text-[7pt] leading-relaxed text-white/80">
            Emitido por {emitidoPor || "—"}
            <br />
            {hoje}
          </p>
        </div>
        <p className="mt-[3mm] text-[7.5pt] font-semibold tracking-[0.2em] text-white/70 uppercase">
          {m.obra ?? "Locação de equipamentos leves"}
        </p>
        <h1 className="text-[17pt] leading-tight font-bold tracking-tight">Medição de locação · {mesPorExtenso(m.mes)}</h1>
        <div className="mt-[3.5mm] flex flex-wrap gap-[2mm] text-[7.5pt] font-semibold">
          <span className="rounded-full bg-white/15 px-[3mm] py-[1mm]">{m.contratante ?? m.cliente}</span>
          {m.contrato_juridico && <span className="rounded-full bg-white/15 px-[3mm] py-[1mm]">Contrato {m.contrato_juridico}</span>}
          <span className="rounded-full bg-white/15 px-[3mm] py-[1mm]">
            {diaMes(m.mes)}/{m.mes.slice(0, 4)} a {diaMes(ultimo)}/{ultimo.slice(0, 4)}
          </span>
          {m.superintendencia && <span className="rounded-full bg-[#F2B33D] px-[3mm] py-[1mm] text-[#3A2A00]">{m.superintendencia}</span>}
        </div>
      </header>

      <div className="px-[8mm] pb-[6mm]">
        <div className="mt-[4mm] grid grid-cols-4 gap-[3mm]">
          <Numero rotulo="Bases" valor={String(bases.length)} detalhe={`${cobrados} equipamentos`} />
          <Numero rotulo="Posições" valor={String(posicoes)} detalhe={`${trocas} troca(s) dentro delas`} />
          <Numero rotulo="Locação" valor={emReais(locacao)} detalhe={`manutenção ${emReais(valorManut)}`} />
          <Numero rotulo="Total da medição" valor={emReais(locacao + valorManut)} forte />
        </div>

        <Titulo numero="1">Identificação</Titulo>
        <div className="grid grid-cols-4 gap-x-[5mm] gap-y-[2.5mm] rounded-[2.5mm] bg-[#F6F7FA] px-[4mm] py-[3mm]">
          <Dado rotulo="Contratante" largo>
            {m.contratante ?? m.cliente}
          </Dado>
          <Dado rotulo="Contratada" largo>
            NOVA OPÇÃO 2008 MÁQUINAS E SERVIÇOS LTDA
          </Dado>
          <Dado rotulo="Obra / serviço" largo>
            {m.obra ?? "LOCAÇÃO DE EQUIPAMENTOS LEVES"}
          </Dado>
          <Dado rotulo="Nº contrato jurídico" falta={!m.contrato_juridico}>
            {m.contrato_juridico ?? "não informado"}
          </Dado>
          <Dado rotulo="Nº contrato sistêmico">{m.contrato_sistemico ?? "—"}</Dado>
          <Dado rotulo="Superintendência">{m.superintendencia ?? "—"}</Dado>
          <Dado rotulo="Período de execução">
            {diaMes(m.mes)}/{m.mes.slice(0, 4)} a {diaMes(ultimo)}/{ultimo.slice(0, 4)}
          </Dado>
          <Dado rotulo="Responsável pelo preenchimento">{emitidoPor ? emitidoPor.toUpperCase() : "—"}</Dado>
          <Dado rotulo="Data">{hoje}</Dado>
          {m.observacao && (
            <Dado rotulo="Observação" largo>
              {m.observacao}
            </Dado>
          )}
        </div>

        <Titulo numero="2">Resumo por município, superintendência e bloco</Titulo>
        <table className="w-full border-collapse tabular-nums">
          <thead className="bg-[#F6F7FA] text-[#4A5368]">
            <tr>
              <th className={th}>Município</th>
              <th className={th}>Superintendência</th>
              <th className={th}>Bloco</th>
              <th className={`${th} text-right`}>Bases</th>
              <th className={`${th} text-right`}>Posições</th>
              <th className={`${th} text-right`}>Locação</th>
              <th className={`${th} text-right`}>Manutenção</th>
              <th className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {resumoOrdenado.map((r) => (
              <tr key={`${r.municipio}|${r.superintendencia}|${r.bloco}`} className="break-inside-avoid">
                <td className={td}>{r.municipio}</td>
                <td className={td}>{r.superintendencia}</td>
                <td className={td}>{r.bloco}</td>
                <td className={`${td} text-right`}>{r.bases || "—"}</td>
                <td className={`${td} text-right`}>{r.posicoes || "—"}</td>
                <td className={`${td} text-right`}>{emReais(r.locacao)}</td>
                <td className={`${td} text-right`}>{r.manutencao ? emReais(r.manutencao) : "—"}</td>
                <td className={`${td} text-right font-semibold`}>{emReais(r.locacao + r.manutencao)}</td>
              </tr>
            ))}
            <tr className="font-bold" style={{ color: AZUL }}>
              <td className="px-[1.5mm] py-[1.3mm]" colSpan={3}>
                Total
              </td>
              <td className="px-[1.5mm] text-right">{bases.length}</td>
              <td className="px-[1.5mm] text-right">{posicoes}</td>
              <td className="px-[1.5mm] text-right">{emReais(locacao)}</td>
              <td className="px-[1.5mm] text-right">{emReais(valorManut)}</td>
              <td className="px-[1.5mm] text-right">{emReais(locacao + valorManut)}</td>
            </tr>
          </tbody>
        </table>

        <Titulo numero="3">Equipamentos por base</Titulo>
        <p className="mb-[2mm] text-[7pt] text-[#4A5368]">
          Cada posição é a vaga de um equipamento na frente. Quando o equipamento é trocado, a posição continua a mesma: a
          troca aparece dentro dela, com o período de cada um — e não como um equipamento a mais.
        </p>
        {bases.map((x) => (
          <section key={x.b.id} className="mb-[4mm]">
            <div className="rounded-t-[2mm] bg-[#F6F7FA] px-[3mm] py-[2mm] break-after-avoid">
              <div className="flex items-end justify-between gap-[3mm]">
                <p className="min-w-0 text-[9pt] font-bold">{x.b.base_nome}</p>
                <p className="shrink-0 text-right text-[7pt] text-[#4A5368]">
                  {x.cobrados} equip. · {x.posicoes.length} posições ·{" "}
                  <span className="text-[10pt] font-bold text-[#141B2D] tabular-nums">{emReais(x.valor)}</span>
                </p>
              </div>
              <div className="mt-[1.5mm] grid grid-cols-[1fr_1.4fr_1.4fr_0.8fr_2fr] gap-x-[4mm]">
                <Dado rotulo="Projeto" falta={!x.base?.projeto}>{x.base?.projeto ?? "não informado"}</Dado>
                <Dado rotulo="Município" falta={!x.base?.municipio}>{x.base?.municipio ?? "não informado"}</Dado>
                <Dado rotulo="Superintendência" falta={!x.base?.superintendencia}>
                  {x.base?.superintendencia ?? "não informada"}
                </Dado>
                <Dado rotulo="Bloco" falta={!x.base?.bloco}>{x.base?.bloco ?? "—"}</Dado>
                <Dado rotulo="Coordenador (AEGEA)" falta={!x.base?.coordenador}>
                  {x.base?.coordenador ?? "não informado"}
                </Dado>
              </div>
            </div>
            <table className="w-full border-collapse tabular-nums">
              <thead className="text-[#7A8294]">
                <tr>
                  <th className={`${th} w-[9mm]`}>Pos.</th>
                  <th className={th}>Equipamento</th>
                  <th className={th}>Patrimônio</th>
                  <th className={th}>Período</th>
                  <th className={`${th} text-right`}>Dias</th>
                  <th className={`${th} text-right`}>Mensal</th>
                  <th className={`${th} text-right`}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {x.posicoes.map((p, n) =>
                  p.itens.length === 1 ? (
                    <tr key={p.itens[0].remessa + p.itens[0].patrimonio} className="break-inside-avoid">
                      <td className={`${td} text-[#7A8294]`}>{n + 1}</td>
                      <td className={td}>
                        {p.itens[0].equipamento}
                        {(p.itens[0] as { coordenador?: string | null }).coordenador && (
                          <span className="ml-[1.5mm] text-[6.5pt] text-[#4A5368]">
                            coord. {(p.itens[0] as { coordenador?: string | null }).coordenador}
                          </span>
                        )}
                      </td>
                      <td className={`${td} font-medium`}>{p.itens[0].patrimonio}</td>
                      <td className={td}>
                        {diaMes(p.itens[0].inicio)} a {diaMes(p.itens[0].fim)}
                      </td>
                      <td className={`${td} text-right`}>{p.itens[0].dias}</td>
                      <td className={`${td} text-right text-[#7A8294]`}>{emReais(p.itens[0].valor_base)}</td>
                      <td className={`${td} text-right`}>{emReais(p.itens[0].valor_total)}</td>
                    </tr>
                  ) : (
                    p.itens.map((i, k) => (
                      <tr key={i.remessa + i.patrimonio} className="break-inside-avoid bg-[#FFF8E8]">
                        <td className={`${td} font-semibold text-[#8A5A00]`}>
                          {n + 1}.{k + 1}
                        </td>
                        <td className={td}>
                          {i.equipamento}
                          <span className="ml-[1.5mm] rounded-full bg-[#F2B33D]/30 px-[1.5mm] text-[6.5pt] font-semibold text-[#8A5A00]">
                            {k === 0 ? `trocado em ${diaMes(p.itens[1].inicio)}` : `substituiu ${p.itens[k - 1].patrimonio}`}
                          </span>
                        </td>
                        <td className={`${td} font-medium`}>{i.patrimonio}</td>
                        <td className={td}>
                          {diaMes(i.inicio)} a {diaMes(i.fim)}
                        </td>
                        <td className={`${td} text-right`}>{i.dias}</td>
                        <td className={`${td} text-right text-[#7A8294]`}>{emReais(i.valor_base)}</td>
                        <td className={`${td} text-right`}>{emReais(i.valor_total)}</td>
                      </tr>
                    ))
                  ),
                )}
              </tbody>
            </table>
          </section>
        ))}

        {linhasManut.length > 0 && (
          <>
            <Titulo numero="4">Manutenção do mês</Titulo>
            <p className="mb-[2mm] text-[7pt] text-[#4A5368]">
              Os boletins de manutenção apresentados em {mesPorExtenso(m.mes)}, somados por projeto, município, superintendência e
              bloco — a mesma linha MANUTENÇÃO da planilha.
            </p>
            <table className="w-full border-collapse tabular-nums">
              <thead className="bg-[#F6F7FA] text-[#4A5368]">
                <tr>
                  <th className={th}>Projeto</th>
                  <th className={th}>Município</th>
                  <th className={th}>Superintendência</th>
                  <th className={th}>Bloco</th>
                  <th className={`${th} text-right`}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {linhasManut.map((l) => (
                  <tr key={[l.projeto, l.cidade, l.superintendencia, l.bloco].join("|")} className="break-inside-avoid">
                    <td className={td}>{l.projeto || "—"}</td>
                    <td className={td}>{l.cidade || "—"}</td>
                    <td className={td}>{l.superintendencia || "—"}</td>
                    <td className={td}>{l.bloco || "—"}</td>
                    <td className={`${td} text-right`}>{emReais(l.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="mt-[6mm] flex items-center justify-between rounded-[2.5mm] px-[4mm] py-[3mm] text-white break-inside-avoid" style={{ background: AZUL }}>
          <p className="text-[8pt] font-semibold tracking-[0.08em] uppercase">Total da medição · {mesPorExtenso(m.mes)}</p>
          <p className="text-[15pt] font-bold tabular-nums">{emReais(locacao + valorManut)}</p>
        </div>
        <p className="mt-[3mm] text-[6.5pt] text-[#7A8294]">
          Nova Opção 2008 Máquinas e Serviços Ltda · os valores de locação são os dos boletins de medição do Sisloc, base a base.
        </p>
      </div>
    </div>
  );
}
