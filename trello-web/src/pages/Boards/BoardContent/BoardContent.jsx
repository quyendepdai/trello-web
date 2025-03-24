import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import { mapOrder } from '~/utils/sorts'

import {
  DndContext,
  //PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

import { useEffect, useState } from 'react'

function BoardContent({ board }) {
  //https://docs.dndkit.com/api-documentation/sensors
  // nếu sử dụng pointerSensor mặc định thì phải sử dụng kết hợp thuộc tính CSS touch-action: none
  // ở phần tử kéo thả - nhưng mà còn bug sử dụng không ngon trên mobile
  // Handle bug click
  // Require the mouse to move by 10 pixels before activating
  // const pointerSensor = useSensor(PointerSensor, {
  //   activationConstraint: {
  //     distance: 10,
  //   },
  // })

  // Handle bug click
  // Require the mouse to move by 10 pixels before activating
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  })

  // With mobile ( Nhấn giữ 250ms và di chuyển 500px thì mới kích hoạt event handleDragEnd)
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 500,
    },
  })

  // const sensors = useSensors(pointerSensor)
  // Ưu tiên sử dụng kết hợp cả mouseSensor và touchSensor để có cả trải nghiệm trên mobile tốt nhất
  // và ko bị bug
  const sensors = useSensors(mouseSensor, touchSensor)

  const [orderedColumns, setOrderedColumns] = useState([])

  useEffect(() => {
    setOrderedColumns(mapOrder(board?.columns, board?.columnOrderIds, '_id'))
  }, [board])

  //Hàm sử lý kéo thả
  // Docs https://docs.dndkit.com/presets/sortable
  const handleDragEnd = (event) => {
    const { active, over } = event

    //Kiểm tra nếu không tồn tại over (Kéo linh tinh or kéo ra ngoài -> return tránh lỗi)
    if (!over) return

    //Nếu vị trí sau khi kéo thả khác với vị trí ban đầu
    if (active.id !== over.id) {
      // Lấy vị trí cũ từ active
      const oldIndex = orderedColumns.findIndex((c) => c._id === active.id)

      // Lấy vị trí mới từ over
      const newIndex = orderedColumns.findIndex((c) => c._id === over.id)

      const dndOrderedColumn = arrayMove(orderedColumns, oldIndex, newIndex)

      // update columnOrderIds -> API -> update Database
      //const dndOrderedColumnIds = dndOrderedColumn.map((c) => c._id)

      // Cập nhật lại state columns sau khi đã kéo thả
      setOrderedColumns(dndOrderedColumn)
    }
  }
  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      <Box
        sx={{
          width: '100%',
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? '#34495e' : '#1976d2',
          display: 'flex',
          height: (theme) => theme.trello.boardContentHeight,
          p: '10px 0',
        }}
      >
        <ListColumns columns={orderedColumns} />
      </Box>
    </DndContext>
  )
}

export default BoardContent
