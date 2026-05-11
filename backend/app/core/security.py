from jose import JWTError, jwt
from fastapi import HTTPException, status
from app.core.config import settings

ALGORITHM = "HS256"

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[ALGORITHM],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
