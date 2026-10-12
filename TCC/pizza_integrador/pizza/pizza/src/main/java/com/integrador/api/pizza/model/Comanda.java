package com.integrador.api.pizza.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "comandas", uniqueConstraints = @UniqueConstraint(name="uk_comanda_dia_numero",columnNames={"data_numeracao","numero_diario"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Comanda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Número anterior preservado por compatibilidade; a interface usa numeroDiario.
    @Column(name = "numero_comanda", nullable = false)
    private Integer numero;

    @Column(name="numero_diario") private Integer numeroDiario;
    @Column(name="data_numeracao") private java.time.LocalDate dataNumeracao;

    public String getReferenciaExibicao() {
        Integer exibido=numeroDiario==null ? numero : numeroDiario;
        String dia=dataNumeracao!=null ? dataNumeracao.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : dataHoraAbertura!=null ? dataHoraAbertura.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "Sem data";
        return dia+" · #"+(exibido==null ? "—" : String.format(java.util.Locale.ROOT,"%03d",exibido));
    }

    @Column(name = "data_hora_abertura", nullable = false)
    private LocalDateTime dataHoraAbertura;

    @Column(name = "data_hora_fechamento")
    private LocalDateTime dataHoraFechamento;

    @Column(name = "status_comanda", nullable = false, length = 50)
    private String status;

    @Column(name = "total_comanda", nullable = false)
    private Double total;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    // --- NOVO CAMPO: Vínculo com a Mesa ---
    @ManyToOne
    @JoinColumn(name = "mesa_id")
    private Mesa mesa;

    @Enumerated(EnumType.STRING)
    private com.integrador.api.pizza.enums.TipoAtendimento tipoAtendimento;
    @Enumerated(EnumType.STRING)
    private com.integrador.api.pizza.enums.EtapaAtendimento etapaAtendimento;
    @Column(length=255) private String enderecoEntrega;
    @Column(length=20) private String telefoneContato;
    @Column(precision=8, scale=2) private java.math.BigDecimal taxaEntrega;
    @Column(length=20) private String origem = "SISTEMA";

    // Registros anteriores não têm esses campos: mantêm o fluxo presencial e taxa zero.
    public com.integrador.api.pizza.enums.TipoAtendimento getTipoAtendimento() {
        return tipoAtendimento == null ? com.integrador.api.pizza.enums.TipoAtendimento.PRESENCIAL : tipoAtendimento;
    }
    public java.math.BigDecimal getTaxaEntrega() {
        return taxaEntrega == null ? java.math.BigDecimal.ZERO : taxaEntrega;
    }

    @JsonIgnore
    @OneToMany(mappedBy = "comanda", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ItemComanda> itens;

    // Construtor atualizado incluindo a mesa
    public Comanda(Integer numero, LocalDateTime dataHoraAbertura, String status, Double total, Usuario usuario, Cliente cliente, Mesa mesa) {
        this.numero = numero;
        this.dataHoraAbertura = dataHoraAbertura;
        this.status = status;
        this.total = total;
        this.usuario = usuario;
        this.cliente = cliente;
        this.mesa = mesa;
    }
}
