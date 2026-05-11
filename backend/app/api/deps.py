from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_token

bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    return decode_token(credentials.credentials)

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    role = current_user.get("app_metadata", {}).get("role")
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
) -> dict | None:
    if credentials is None:
        return None
    return decode_token(credentials.credentials)
