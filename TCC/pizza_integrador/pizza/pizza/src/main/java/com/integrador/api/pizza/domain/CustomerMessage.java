package com.integrador.api.pizza.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "customer_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerMessage {
    public enum Channel { WHATSAPP, SMS, EMAIL }
    public enum Status { QUEUED, SENT, FAILED, CANCELED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long branchId;
    private Long customerId; private Long orderId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Channel channel;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(nullable = false) private String recipient;
    private String templateCode;
    @Column(nullable = false, length = 2000) private String body;
    private String providerReference; private LocalDateTime scheduledAt; private LocalDateTime sentAt;
    @Builder.Default private LocalDateTime createdAt = LocalDateTime.now();
}
