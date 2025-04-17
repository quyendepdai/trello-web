import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import Column from './ListColumns/Column/Column'
import CardItem from './ListColumns/Column/ListCards/CardItem/CardItem'

import {
  DndContext,
  //PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  closestCorners,
  pointerWithin,
  // rectIntersection,
  getFirstCollision,
  closestCenter,
} from '@dnd-kit/core'
import { MouseSensor, TouchSensor } from '~/customLibraries/DndKitSensors'

import { arrayMove } from '@dnd-kit/sortable'

import { useCallback, useEffect, useRef, useState } from 'react'
import _ from 'lodash'
import { generatePlaceholderCard } from '~/utils/formatters'

const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: 'ACTIVE_DRAG_ITEM_TYPE_COLUMN',
  CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD',
}

function BoardContent({
  board,
  createNewColumn,
  createNewCard,
  moveColumn,
  moveCardInTheSameColumn,
  moveCardToDifferentColumn,
  deleteColumnDetail,
}) {
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

  // tại 1 thời điểm chỉ có 1 phần tử đc kéo (column hoặc card)
  const [activeDragItemId, setActiveDragItemId] = useState(null)
  const [activeDragItemType, setActiveDragItemType] = useState(null)
  const [activeDragItemData, setActiveDragItemData] = useState(null)
  const [oldColumnWhenDraggingCard, setOldColumnWhenDraggingCard] = useState(null)

  //Điểm va chạm cuối cùng ( xử lý thuật toán video37)
  const lastOverId = useRef(null)

  useEffect(() => {
    //columns đã được sắp xếp ở component cha Board
    setOrderedColumns(board.columns)
  }, [board])

  const findColumnByCardId = (cardId) => {
    return orderedColumns.find((column) => column?.cards?.map((card) => card._id).includes(cardId))
  }

  //Khởi tạo func chung xử lý việc cập nhật lại state
  const moveCardBetweenDifferentColumns = (
    overColumn,
    overCardId,
    active,
    over,
    activeColumn,
    activeDraggingCardId,
    // activeDraggingCardData,
    triggerFrom,
  ) => {
    setOrderedColumns((prev) => {
      // tim vi tri (index) cua cai overCard trong column dich
      const overCardIndex = overColumn?.cards?.findIndex((card) => card._id === overCardId)

      // Logic tinh toan vi tri cardIndex (logic lay tu code cua dnd kit )
      let newCardIndex
      const isBelowOverItem =
        active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height

      const modifier = isBelowOverItem ? 1 : 0

      newCardIndex = overCardIndex >= 0 ? overCardIndex + modifier : overColumn?.cards.length + 1

      // Clone mảng orederedColumsState cũ ra 1 cái mới để xử lý data rồi return - Cập nhật lại orderedColumnsState
      const nextColumns = _.cloneDeep(prev)
      const nextActiveColumn = nextColumns.find((c) => c._id === activeColumn._id)
      const nextOverColumn = nextColumns.find((c) => c._id === overColumn._id)

      // xử lý logic column cũ
      if (nextActiveColumn) {
        // Xóa card đang kéo ra khỏi column ban đầu
        nextActiveColumn.cards = nextActiveColumn.cards.filter(
          (card) => card._id !== activeDraggingCardId,
        )

        //Thêm FE_PlaceholderCard nếu Column rỗng : bị kéo hết
        if (_.isEmpty(nextActiveColumn.cards)) {
          //
          nextActiveColumn.cards = [generatePlaceholderCard(nextActiveColumn)]
        }

        // cập nhật lại mảng cardOrderIds
        nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map((card) => card._id)
      }

      // xử lý logic column mới
      if (nextOverColumn) {
        //Kiểm tra xem card đang kéo có tồn tại ở column đích hay không, nếu có thì xóa đi
        nextOverColumn.cards = nextOverColumn.cards.filter(
          (card) => card._id !== activeDraggingCardId,
        )

        const rebuild_activeDragItemData = {
          ...activeDragItemData,
          columnId: nextOverColumn._id,
        }
        //Thêm card vào column đích theo vị trí index mới
        nextOverColumn.cards = nextOverColumn.cards.toSpliced(
          newCardIndex,
          0,
          rebuild_activeDragItemData,
        )

        //Xóa FE_PlaceholderCard nếu Column đích có
        nextOverColumn.cards = nextOverColumn.cards.filter((card) => !card.FE_PlaceholderCard)

        // cập nhật lại mảng cardOrderIds
        nextOverColumn.cardOrderIds = nextOverColumn.cards.map((card) => card._id)
      }

      // Nếu func này đc gọi từ handleDragEnd thì nghĩa là đã kéo thả xog, lúc này mới thực hiện call api update card ở 2 column khác nhau
      if (triggerFrom === 'handleDragEnd') {
        /**
         * Phải dùng tới activeDragItemData.columnId hoặc tốt nhất là oldColumnWhenDraggingCard._id (set vao state từ bước handleDragStart)
         * chứ không phải activeData trong scope handleDragEnd này vì sau khi đi qua onDragOver và tới đây thì state đã bị cập nhật lại 1 lần r
         */
        moveCardToDifferentColumn(
          activeDraggingCardId,
          oldColumnWhenDraggingCard._id,
          nextOverColumn._id,
          nextColumns,
        )
      }

      return nextColumns
    })
  }

  //Khi bắt đầu kéo 1 phần tử (drag)
  const handleDragStart = (event) => {
    setActiveDragItemId(event?.active?.id)
    setActiveDragItemType(
      event?.active?.data?.current?.columnId
        ? ACTIVE_DRAG_ITEM_TYPE.CARD
        : ACTIVE_DRAG_ITEM_TYPE.COLUMN,
    )
    setActiveDragItemData(event?.active?.data?.current)

    //Nếu là kéo Card thì mới set giá trị oldColumn -> dragEnd
    if (event?.active?.data?.current?.columnId) {
      setOldColumnWhenDraggingCard(findColumnByCardId(event?.active?.id))
    }
  }

  //trigger trong quá trình kéo (drag) 1 phần tử (trong card)
  const handleDragOver = (event) => {
    // Ko làm j thêm khi kéo column
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) return

    //Card (xử lý kéo card qua lại giữa các cloumn)
    const { active, over } = event

    //Kiểm tra nếu không tồn tại over (Kéo linh tinh or kéo ra ngoài -> return tránh lỗi)
    if (!over || !active) return

    // activeDraggingCardId: id của card đang đc kéo
    const {
      id: activeDraggingCardId,
      data: { current: activeDraggingCardData },
    } = active

    // overCardId: id của card đang tương tác trên hoặc dưới so với card được kéo ở trên
    const { id: overCardId } = over

    // Tìm 2 columns theo id
    const activeColumn = findColumnByCardId(activeDraggingCardId)
    const overColumn = findColumnByCardId(overCardId)

    //Nếu không tồn tại 1 trong 2 column thì return, tránh crash trang web
    if (!overColumn || !activeColumn) return

    // Xử lý logic kéo card qua 2 columns khác nhau, còn nếu kéo trong column của chính nó thì ko lm j
    if (activeColumn._id !== overColumn._id) {
      moveCardBetweenDifferentColumns(
        overColumn,
        overCardId,
        active,
        over,
        activeColumn,
        activeDraggingCardId,
        'handleDragOver',
      )
    }
  }

  //Khi kết thúc hành động kéo (thả drop)
  // Docs https://docs.dndkit.com/presets/sortable
  const handleDragEnd = (event) => {
    const { active, over } = event

    //Kiểm tra nếu không tồn tại over (Kéo linh tinh or kéo ra ngoài -> return tránh lỗi)
    if (!over || !active) return

    //Logic Drag-Drop Card
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
      // activeDraggingCardId: id của card đang đc kéo
      const {
        id: activeDraggingCardId,
        data: { current: activeDraggingCardData },
      } = active

      // overCardId: id của card đang tương tác trên hoặc dưới so với card được kéo ở trên
      const { id: overCardId } = over

      // Tìm 2 columns theo id
      const activeColumn = findColumnByCardId(activeDraggingCardId)
      const overColumn = findColumnByCardId(overCardId)

      //Nếu không tồn tại 1 trong 2 column thì return, tránh crash trang web
      if (!overColumn || !activeColumn) return

      //kéo Card giữa 2 Column khác nhau
      if (oldColumnWhenDraggingCard._id !== overColumn._id) {
        moveCardBetweenDifferentColumns(
          overColumn,
          overCardId,
          active,
          over,
          activeColumn,
          activeDraggingCardId,
          'handleDragEnd',
        )
      }
      //Kéo thả card trong 1 column
      else {
        // Lấy vị trí cũ từ active
        const oldCardIndex = oldColumnWhenDraggingCard?.cards.findIndex(
          (c) => c._id === activeDragItemId,
        )

        // Lấy vị trí mới từ over
        const newCardIndex = overColumn?.cards.findIndex((c) => c._id === overCardId)

        //Sort lại các card trong column
        const dndOrderedCards = arrayMove(
          oldColumnWhenDraggingCard?.cards,
          oldCardIndex,
          newCardIndex,
        )

        const dndOrderedCardIds = dndOrderedCards.map((c) => c._id)
        // Update lại các card trong column
        setOrderedColumns((prev) => {
          // Clone mảng orederedColumsState cũ ra 1 cái mới để xử lý data rồi return - Cập nhật lại orderedColumnsState
          const nextColumns = _.cloneDeep(prev)

          //Tìm tới column đang thả
          const currentColumn = nextColumns.find((c) => c._id === overColumn._id)

          // Update lại các card trong column và cardOrderedIds
          currentColumn.cards = dndOrderedCards
          currentColumn.cardOrderIds = dndOrderedCardIds

          //Trả về giá trị state mới (chuẩn vị trí)
          return nextColumns
        })

        moveCardInTheSameColumn(dndOrderedCards, dndOrderedCardIds, oldColumnWhenDraggingCard._id)
      }
    }

    //Logic Drag-Drop Column
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
      //Nếu vị trí sau khi kéo thả khác với vị trí ban đầu
      if (active.id !== over.id) {
        // Lấy vị trí cũ từ active
        const oldColumnIndex = orderedColumns.findIndex((c) => c._id === active.id)

        // Lấy vị trí mới từ over
        const newColumnIndex = orderedColumns.findIndex((c) => c._id === over.id)

        //Sort lại các column
        const dndOrderedColumn = arrayMove(orderedColumns, oldColumnIndex, newColumnIndex)

        // Cập nhật lại state columns sau khi đã kéo thả
        setOrderedColumns(dndOrderedColumn)

        // update columnOrderIds -> API -> update Database
        //const dndOrderedColumnIds = dndOrderedColumn.map((c) => c._id)
        moveColumn(dndOrderedColumn)
      }
    }

    //Những giữ liệu sau khi kéo thả phải đưa về null mặc định ban đầu
    setActiveDragItemId(null)
    setActiveDragItemType(null)
    setActiveDragItemData(null)
    setOldColumnWhenDraggingCard(null)
  }

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  }

  //Custom chiến lược / thuật toán phát hiệ va chạm tối ưu cho việc kéo thả card giữa nhiều column (video37)
  const collisionDetectionStrategy = useCallback(
    (args) => {
      if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
        return closestCorners({ ...args })
      }

      //tìm các điểm giao nhau, va chạm -Itersection với con trỏ
      const pointerIntersections = pointerWithin(args)

      if (!pointerIntersections?.length) return

      // const intersections =
      //   pointerIntersections?.length > 0 ? pointerIntersections : rectIntersection(args)

      // Tìm overId đầu tiên trong đám intersections ở trên
      let overId = getFirstCollision(pointerIntersections, 'id')
      if (overId) {
        const checkColumn = orderedColumns.find((cl) => cl._id === overId)
        if (checkColumn) {
          overId = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((container) => {
              return container.id !== overId && checkColumn?.cardOrderIds?.includes(container.id)
            }),
          })[0]?.id
        }

        lastOverId.current = overId
        return [{ id: overId }] // trả về id của column đang giao nhau
      }

      // Nếu overId là null thì trả về mảng rỗng - tránh bug crash trang
      return lastOverId.current ? [{ id: lastOverId.current }] : []
    },
    [activeDragItemType, orderedColumns],
  )

  return (
    <DndContext
      sensors={sensors}
      // collisionDetection={closestCorners}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <Box
        sx={{
          width: '100%',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#34495e' : '#1976d2'),
          display: 'flex',
          height: (theme) => theme.trello.boardContentHeight,
          p: '10px 0',
        }}
      >
        <ListColumns
          columns={orderedColumns}
          createNewColumn={createNewColumn}
          createNewCard={createNewCard}
          deleteColumnDetail={deleteColumnDetail}
        />

        {/* Giữ chỗ */}
        <DragOverlay dropAnimation={dropAnimation}>
          {!activeDragItemType && null}
          {activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN && (
            <Column column={activeDragItemData} />
          )}
          {activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD && (
            <CardItem card={activeDragItemData} />
          )}
        </DragOverlay>
      </Box>
    </DndContext>
  )
}

export default BoardContent
