package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.InsumoCadastroDTO;
import com.integrador.api.pizza.model.Insumo;
import com.integrador.api.pizza.repository.InsumoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class InsumoService {

    @Autowired
    private InsumoRepository repository;
    @Autowired private MovimentoEstoqueService movimentos;

    @Transactional
    public Insumo cadastrarInsumo(InsumoCadastroDTO dados) {
        Insumo insumo = new Insumo( // Usar o novo construtor
                dados.getNome(),
                0.0,
                dados.getUnidade()
        );
        insumo=repository.save(insumo);
        registrarAjuste(insumo,dados.getQuantidade());
        return insumo;
    }

    public List<Insumo> listarTodos() {
        return repository.findAll();
    }

    public Optional<Insumo> buscarPorId(Long id) {
        return repository.findById(id);
    }

    @Transactional
    public Insumo atualizarInsumo(Long id, InsumoCadastroDTO dados) {
        return repository.buscarParaAtualizar(id).map(insumoExistente -> {
            if (!insumoExistente.getUnidade().equalsIgnoreCase(dados.getUnidade())) throw new IllegalArgumentException("A unidade de um insumo existente não pode ser trocada, pois alteraria o histórico. Cadastre outro insumo.");
            insumoExistente.setNome(dados.getNome());
            registrarAjuste(insumoExistente,dados.getQuantidade());
            insumoExistente.setUnidade(dados.getUnidade());
            return repository.save(insumoExistente);
        }).orElseThrow(() -> new RuntimeException("Insumo não encontrado com ID: " + id));
    }

    public void deletarInsumo(Long id) {
        repository.deleteById(id);
    }
    private void registrarAjuste(Insumo insumo, Double desejada) {
        if (desejada==null || !Double.isFinite(desejada) || desejada<0) throw new IllegalArgumentException("Saldo de insumo inválido.");
        double delta=java.math.BigDecimal.valueOf(desejada).subtract(java.math.BigDecimal.valueOf(insumo.getQuantidade()==null ? 0 : insumo.getQuantidade())).doubleValue();
        if (delta==0) return;
        var dto=new com.integrador.api.pizza.dto.MovimentoEstoqueCadastroDTO(); dto.setInsumoId(insumo.getId()); dto.setTipo(delta>0 ? "ENTRADA" : "SAIDA"); dto.setQuantidade(Math.abs(delta));
        movimentos.cadastrarMovimento(dto);
    }
}
