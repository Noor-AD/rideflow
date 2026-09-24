package com.rideflow.backend;

import java.util.Set;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.rideflow.backend.model.DriverApprovalStatus;
import com.rideflow.backend.model.DriverProfile;
import com.rideflow.backend.model.Role;
import com.rideflow.backend.model.User;
import com.rideflow.backend.model.VehicleType;
import com.rideflow.backend.repository.DriverRepository;
import com.rideflow.backend.repository.UserRepository;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner initDefaultUsers(
			UserRepository userRepository,
			DriverRepository driverRepository,
			PasswordEncoder passwordEncoder) {
		return args -> {
			// 1. Admin
			if (!userRepository.existsByEmail("admin@rideflow.test")) {
				User admin = User.builder()
						.name("Operations Administrator")
						.email("admin@rideflow.test")
						.password(passwordEncoder.encode("admin123"))
						.phone("+919999999999")
						.roles(Set.of(Role.ROLE_ADMIN))
						.build();
				userRepository.save(admin);
				System.out.println("✅ Default admin user verified: admin@rideflow.test / admin123");
			}

			// 2. Rider
			if (!userRepository.existsByEmail("rider@rideflow.test")) {
				User rider = User.builder()
						.name("Rahul Sharma")
						.email("rider@rideflow.test")
						.password(passwordEncoder.encode("Password@123"))
						.phone("+919876543210")
						.roles(Set.of(Role.ROLE_RIDER))
						.build();
				userRepository.save(rider);
				System.out.println("✅ Default rider user verified: rider@rideflow.test / Password@123");
			}

			// 3. Driver
			User driverUser = userRepository.findByEmail("driver@rideflow.test").orElseGet(() -> {
				User driver = User.builder()
						.name("Suresh Kumar")
						.email("driver@rideflow.test")
						.password(passwordEncoder.encode("Password@123"))
						.phone("+919876543211")
						.roles(Set.of(Role.ROLE_DRIVER))
						.build();
				System.out.println("✅ Default driver user created: driver@rideflow.test / Password@123");
				return userRepository.save(driver);
			});

			// 4. Driver Profile
			if (driverRepository.findByUserId(driverUser.getId()).isEmpty()) {
				DriverProfile profile = DriverProfile.builder()
						.user(driverUser)
						.licenseNumber("DL-KA01-20230001")
						.vehiclePlate("KA-01-EQ-9999")
						.vehicleModel("Toyota Camry Hybrid")
						.vehicleType(VehicleType.ECONOMY)
						.approvalStatus(DriverApprovalStatus.VERIFIED)
						.isOnline(true)
						.rating(4.9)
						.totalRides(120)
						.currentLatitude(12.9716)
						.currentLongitude(77.5946)
						.build();
				driverRepository.save(profile);
				System.out.println("✅ Default driver profile verified & online: KA-01-EQ-9999");
			}
		};
	}
}
