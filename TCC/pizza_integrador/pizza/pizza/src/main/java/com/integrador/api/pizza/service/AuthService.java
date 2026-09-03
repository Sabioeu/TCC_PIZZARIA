package com.integrador.api.pizza.service;

import com.integrador.api.pizza.domain.AppUser;
import com.integrador.api.pizza.repository.AppUserRepository;
import com.integrador.api.pizza.security.AppPrincipal;
import com.integrador.api.pizza.security.JwtService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ConcurrentMap<String, LoginAttempt> attempts = new ConcurrentHashMap<>();

    @Transactional
    public LoginResponse login(LoginRequest request) {
        if (request == null || request.email() == null || request.password() == null) throw new BadCredentialsException("Informe e-mail e senha");
        String key = request.email().trim().toLowerCase(Locale.ROOT); assertNotBlocked(key);
        AppUser user;
        try { user = users.findByEmailIgnoreCase(key).filter(AppUser::isActive).orElseThrow(() -> new BadCredentialsException("E-mail ou senha invalidos")); }
        catch (BadCredentialsException exception) { failedLogin(key); throw exception; }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            failedLogin(key);
            throw new BadCredentialsException("E-mail ou senha invalidos");
        }
        attempts.remove(key);
        user.setLastLoginAt(LocalDateTime.now());
        return new LoginResponse(jwtService.issue(user), profile(user));
    }

    public UserProfile me(AppPrincipal principal) {
        return users.findById(principal.id()).map(this::profile)
                .orElseThrow(() -> new EntityNotFoundException("Usuario nao encontrado"));
    }

    public List<UserProfile> users(Long branchId) {
        return users.findAllByBranchIdOrderByNameAsc(branchId).stream().map(this::profile).toList();
    }

    @Transactional
    public UserProfile create(Long branchId, CreateUser request) {
        if (request == null || request.name() == null || request.email() == null || request.password() == null || request.role() == null)
            throw new IllegalArgumentException("Preencha nome, e-mail, senha e função");
        if (request.password().length() < 10 || !request.password().matches(".*[A-Z].*") || !request.password().matches(".*[a-z].*") || !request.password().matches(".*\\d.*"))
            throw new IllegalArgumentException("A senha deve ter 10 caracteres, maiúscula, minúscula e número");
        if (users.findByEmailIgnoreCase(request.email()).isPresent()) throw new IllegalArgumentException("E-mail ja cadastrado");
        AppUser user = AppUser.builder().branchId(branchId).name(request.name().trim())
                .email(request.email().trim().toLowerCase()).passwordHash(passwordEncoder.encode(request.password()))
                .role(request.role()).active(true).build();
        return profile(users.save(user));
    }

    private UserProfile profile(AppUser user) {
        return new UserProfile(user.getId(), user.getBranchId(), user.getName(), user.getEmail(), user.getRole(), user.isActive(), user.getLastLoginAt());
    }

    private void assertNotBlocked(String key) {
        LoginAttempt attempt = attempts.get(key);
        if (attempt != null && attempt.blockedUntil() != null && attempt.blockedUntil().isAfter(LocalDateTime.now()))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente");
        if (attempt != null && attempt.blockedUntil() != null) attempts.remove(key);
    }

    private void failedLogin(String key) {
        attempts.compute(key, (email, current) -> {
            int failures = current == null ? 1 : current.failures() + 1;
            return new LoginAttempt(failures, failures >= 5 ? LocalDateTime.now().plusMinutes(15) : null);
        });
    }

    public record LoginRequest(String email, String password) { }
    public record LoginResponse(String token, UserProfile user) { }
    public record UserProfile(Long id, Long branchId, String name, String email, AppUser.Role role, boolean active, LocalDateTime lastLoginAt) { }
    public record CreateUser(String name, String email, String password, AppUser.Role role) { }
    private record LoginAttempt(int failures, LocalDateTime blockedUntil) { }
}
