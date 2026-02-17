package com.litchi.wealth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.litchi.wealth.entity.UserPositionSnapshot;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户持仓快照表 Mapper接口
 *
 * @author Embrace
 * @date 2026-02-17
 */
@Mapper
public interface UserPositionSnapshotMapper extends BaseMapper<UserPositionSnapshot> {

}
