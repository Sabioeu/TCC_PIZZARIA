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

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        if (request == null || request.email() == null || request.password() == null) throw new BadCredentialsException("Informe e-mail e senha");
        AppUser user = users.findByEmailIgnoreCase(request.email())
                .filter(AppUser::isActive)
                .orElseThrow(() -> new BadCredentialsException("E-mail ou senha invalidos"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("E-mail ou senha invalidos");
        }
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
        if (users.findByEmailIgnoreCase(request.email()).isPresent()) throw new IllegalArgumentException("E-mail ja cadastrado");
        AppUser user = AppUser.builder().branchId(branchId).name(request.name().trim())
                .email(request.email().trim().toLowerCase()).passwordHash(passwordEncoder.encode(request.password()))
                .role(request.role()).active(true).build();
        return profile(users.save(user));
    }

    private UserProfile profile(AppUser user) {
        return new UserProfile(user.getId(), user.getBranchId(), user.getName(), user.getEmail(), user.getRole(), user.isActive(), user.getLastLoginAt());
    }

    public record LoginRequest(String email, String password) { }
    public record LoginResponse(String token, UserProfile user) { }
    public record UserProfile(Long id, Long branchId, String name, String email, AppUser.Role role, boolean active, LocalDateTime lastLoginAt) { }
    public record CreateUser(String name, String email, String password, AppUser.Role role) { }
}
