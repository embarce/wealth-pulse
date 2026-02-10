from typing import Optional, Generic, TypeVar, List
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """通用API响应模型"""
    code: int = Field(..., description="状态码", example=200)
    msg: str = Field(..., description="响应消息", example="success")
    data: Optional[T] = Field(None, description="响应数据")
    timestamp: datetime = Field(default_factory=datetime.now, description="响应时间戳")

    class Config:
        json_schema_extra = {
            "example": {
                "code": 200,
                "msg": "success",
                "data": {},
                "timestamp": "2026-02-09T15:30:00"
            }
        }


class PageData(BaseModel, Generic[T]):
    """分页数据模型"""
    items: List[T] = Field(..., description="数据列表")
    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页大小")
    pages: int = Field(..., description="总页数")

    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "page_size": 10,
                "pages": 10
            }
        }


# 常用响应代码常量
class ResponseCode:
    SUCCESS = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    VALIDATION_ERROR = 422
    INTERNAL_ERROR = 500


def success_response(data=None, msg: str = "success", code: int = ResponseCode.SUCCESS) -> dict:
    """成功响应"""
    return {
        "code": code,
        "msg": msg,
        "data": data,
        "timestamp": datetime.now()
    }


def error_response(msg: str, code: int = ResponseCode.INTERNAL_ERROR, data=None) -> dict:
    """错误响应"""
    return {
        "code": code,
        "msg": msg,
        "data": data,
        "timestamp": datetime.now()
    }


def page_response(items: List, total: int, page: int = 1, page_size: int = 10, msg: str = "success") -> dict:
    """分页响应"""
    pages = (total + page_size - 1) // page_size if total > 0 else 0
    return {
        "code": ResponseCode.SUCCESS,
        "msg": msg,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages
        },
        "timestamp": datetime.now()
    }
