from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Union
from datetime import datetime

from app.schemas.common import ResponseCode


class ApiException(Exception):
    """自定义API异常"""
    def __init__(
        self,
        msg: str,
        code: int = ResponseCode.INTERNAL_ERROR,
        data=None
    ):
        self.msg = msg
        self.code = code
        self.data = data


async def api_exception_handler(request: Request, exc: ApiException):
    """API异常处理器"""
    return JSONResponse(
        status_code=200,  # 统一返回200，错误信息在code字段中
        content={
            "code": exc.code,
            "msg": exc.msg,
            "data": exc.data,
            "timestamp": datetime.now().isoformat()
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP异常处理器"""
    return JSONResponse(
        status_code=200,  # 统一返回200
        content={
            "code": exc.status_code,
            "msg": exc.detail,
            "data": None,
            "timestamp": datetime.now().isoformat()
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """请求验证异常处理器"""
    errors = exc.errors()
    error_msg = "; ".join([f"{'.'.join(str(loc) for loc in error['loc'])}: {error['msg']}" for error in errors])

    return JSONResponse(
        status_code=200,  # 统一返回200
        content={
            "code": ResponseCode.VALIDATION_ERROR,
            "msg": f"参数验证失败: {error_msg}",
            "data": {"errors": errors},
            "timestamp": datetime.now().isoformat()
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """通用异常处理器"""
    return JSONResponse(
        status_code=200,  # 统一返回200
        content={
            "code": ResponseCode.INTERNAL_ERROR,
            "msg": f"服务器内部错误: {str(exc)}",
            "data": None,
            "timestamp": datetime.now().isoformat()
        }
    )
