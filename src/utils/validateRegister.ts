import { REGEX_PATTERNS } from "../constants";
import { RegisterInput } from "src/typeorm-types/input-types";
import { UserFieldError } from "src/typeorm-types/object-types";

export const validateRegister = ({
	email,
	username,
	password,
}: RegisterInput): UserFieldError[] => {
	const errors: UserFieldError[] = [];
	if (!email || !email.includes("@")) {
		errors.push({ field: "email", message: "invalid email" });
	}
	if (username.length <= 2) {
		errors.push({ field: "username", message: "username too short" });
	}
	if (username.includes("@")) {
		errors.push({ field: "username", message: "cannot include '@'" });
	}
	if (password.length <= 3) {
		errors.push({ field: "password", message: "password too weak" });
	}
	validatePassword(password, errors);
	return errors;
};

// objects are always passed by reference in TS, so this mutates the original 'errors' list
const validatePassword = (password: string, errors: UserFieldError[]) => {
	if (!REGEX_PATTERNS.hasNumber.test(password)) {
		errors.push({
			field: "password",
			message: "password must contain atleast one number",
		});
	}
	if (REGEX_PATTERNS.hasNoSymbols.test(password)) {
		errors.push({
			field: "password",
			message: "password must contain atleast one symbol",
		});
	}
	if (!REGEX_PATTERNS.hasUppercase.test(password)) {
		errors.push({
			field: "password",
			message: "password must contain atleast one uppercase letter",
		});
	}
	if (!REGEX_PATTERNS.hasLowercase.test(password)) {
		errors.push({
			field: "password",
			message: "password must contain atleast one lowercase letter",
		});
	}

	return errors;
};

