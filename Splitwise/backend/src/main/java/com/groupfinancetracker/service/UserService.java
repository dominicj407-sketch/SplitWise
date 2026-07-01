package com.groupfinancetracker.service;

import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.User;
import com.groupfinancetracker.exception.NotFoundException;
import com.groupfinancetracker.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DtoModels.UserResponse create(DtoModels.CreateUserRequest req) {
        String hash = passwordEncoder.encode(req.password());
        User user = User.builder().name(req.name()).email(req.email()).passwordHash(hash).build();
        user = userRepository.save(user);
        return toDto(user);
    }

    public List<DtoModels.UserResponse> list() {
        return userRepository.findAll().stream().map(this::toDto).toList();
    }

    public DtoModels.UserResponse get(Long id) {
        return userRepository.findById(id).map(this::toDto)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
    }

    public void delete(Long id) {
        if (!userRepository.existsById(id)) throw new NotFoundException("User not found: " + id);
        userRepository.deleteById(id);
    }

    public DtoModels.UserResponse updateProfile(Long userId, DtoModels.UpdateProfileRequest req) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
        u.setName(req.name());
        u.setUpiId(req.upiId());
        u = userRepository.save(u);
        return toDto(u);
    }

    public List<DtoModels.UserResponse> search(String query) {
        return userRepository.findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(query, query)
                .stream().map(this::toDto).toList();
    }

    private DtoModels.UserResponse toDto(User u) {
        return new DtoModels.UserResponse(u.getId(), u.getName(), u.getEmail(), u.getUpiId(), u.getCreatedAt());
    }
}
