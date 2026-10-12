package com.integrador.api.pizza.service;

import com.integrador.api.pizza.model.ControleNumeracaoComanda;
import com.integrador.api.pizza.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.util.HashMap;

@Service
public class NumeracaoComandaService implements ApplicationRunner {
    private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(NumeracaoComandaService.class);
    private final ControleNumeracaoComandaRepository controle;
    private final ComandaRepository comandas;
    private final TransactionTemplate transacao;
    private final Clock relogio;
    public NumeracaoComandaService(ControleNumeracaoComandaRepository controle,ComandaRepository comandas,
            PlatformTransactionManager manager,@Value("${pizza.operacao.fuso:America/Sao_Paulo}") String fuso) {
        this.controle=controle; this.comandas=comandas;
        transacao=new TransactionTemplate(manager); relogio=Clock.system(ZoneId.of(fuso));
    }
    @Override public void run(ApplicationArguments args) {
        try {
            transacao.executeWithoutResult(s -> {
                if(!controle.existsById(1)) controle.saveAndFlush(new ControleNumeracaoComanda(1));
            });
        } catch(DataIntegrityViolationException concorrenciaInicial) {
            // Outra instância pode ter criado a mesma linha. A transação já reverteu.
            if(!controle.existsById(1)) throw concorrenciaInicial;
        }
        Integer atualizadas=transacao.execute(s -> {
            controle.bloquear().orElseThrow();
            var ultimos=new HashMap<LocalDate,Integer>();
            int quantidade=0;
            for(var c:comandas.semNumeracaoDiaria()) {
                var dia=c.getDataHoraAbertura().toLocalDate();
                int anterior=ultimos.computeIfAbsent(dia,d -> comandas.maxNumeroDiario(d).orElse(0));
                int proximo=Math.incrementExact(anterior);
                c.setDataNumeracao(dia); c.setNumeroDiario(proximo);
                ultimos.put(dia,proximo);
                quantidade++;
            }
            comandas.flush();
            return quantidade;
        });
        log.info("Numeração diária inicializada: {} referências anteriores atualizadas; IDs e números originais preservados.",atualizadas);
    }
    public record Numeracao(LocalDateTime abertura,int diario,int legado) {}
    /** O lock permanece até o commit da própria abertura; falha não reserva número. */
    @Transactional(propagation=Propagation.MANDATORY)
    public Numeracao proxima() {
        controle.bloquear().orElseThrow(() -> new IllegalStateException("Numeração não inicializada."));
        return proximaNoDia(LocalDateTime.now(relogio));
    }
    Numeracao proximaNoDia(LocalDateTime abertura) {
        int diario=Math.incrementExact(comandas.maxNumeroDiario(abertura.toLocalDate()).orElse(0));
        int legado=Math.incrementExact(comandas.findMaxNumeroComanda().orElse(0));
        return new Numeracao(abertura,diario,legado);
    }
}
