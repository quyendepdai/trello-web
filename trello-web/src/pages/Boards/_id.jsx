// Boards Details
import { Box, Container, Typography } from '@mui/material' //quick custom css
import CircularProgress from '@mui/material/CircularProgress'

import AppBar from '~/components/AppBar/AppBar'
import BoardBar from './BoardBar/BoardBar'
import BoardContent from './BoardContent/BoardContent'
import { mapOrder } from '~/utils/sorts'
import { toast } from 'react-toastify'

// import { mockData } from '~/apis/mock-data'

import {
  fetchBoardDetailAPI,
  createNewColumnAPI,
  createNewCardAPI,
  updateBoardDetailAPI,
  updateColumnDetailAPI,
  moveCardToDifferentColumnAPI,
  deleteColumnDetailAPI,
} from '~/apis'
import { generatePlaceholderCard } from '~/utils/formatters'
import { isEmpty } from 'lodash'

import { useEffect, useState } from 'react'

function Board() {
  const [board, setBoard] = useState(null)

  useEffect(() => {
    const boardId = '67eaab9ce0e49206521246ed'
    fetchBoardDetailAPI(boardId).then((boardData) => {
      // Sắp xếp thứ tự column trc khi đưa dữ liệu xuống các component con
      boardData.column = mapOrder(board?.columns, board?.columnOrderIds, '_id')

      boardData.columns.forEach((column) => {
        // create card giữ chỗ để có thể kéo thả qua lại các column rỗng
        if (isEmpty(column.cards)) {
          column.cards = [generatePlaceholderCard(column)]
          column.cardOrderIds = [generatePlaceholderCard(column)._id]
        } else {
          // Sắp xếp thứ tự cards trc khi đưa dữ liệu xuống các component con
          column.cards = mapOrder(column?.cards, column?.cardOrderIds, '_id')
        }
      })

      setBoard(boardData)
    })
  }, [])

  // call api create new column and set state board
  const createNewColumn = async (newColumnData) => {
    const createdColumn = await createNewColumnAPI({
      ...newColumnData,
      boardId: board._id,
    })

    // create card giữ chỗ để có thể kéo thả qua lại các column rỗng
    createdColumn.cards = [generatePlaceholderCard(createdColumn)]
    createdColumn.cardOrderIds = [generatePlaceholderCard(createdColumn)._id]

    // setBoard()
    const newBoard = { ...board }
    newBoard.columns.push(createdColumn)
    newBoard.columnOrderIds.push(createdColumn._id)

    setBoard(newBoard)
  }

  // call api create new card and set state board
  const createNewCard = async (newCardData) => {
    const createdCard = await createNewCardAPI({
      ...newCardData,
      boardId: board._id,
    })

    // setBoard()
    const newBoard = { ...board }
    const columnToUpdate = newBoard.columns.find((column) => column._id === createdCard.columnId)
    if (columnToUpdate) {
      //Nếu column rỗng thì xóa card giữ chỗ đi
      if (columnToUpdate.cards.some((card) => card.FE_PlaceholderCard)) {
        columnToUpdate.cards = [createdCard]
        columnToUpdate.cardOrderIds = [createdCard._id]
      } else {
        // column đã có data thì push vào cuối mảng
        columnToUpdate.cards.push(createdCard)
        columnToUpdate.cardOrderIds.push(createdCard._id)
      }
    }

    setBoard(newBoard)
  }

  // Func xử lý gọi api xử lý sắp xếp khi kéo thả columns
  //call api để cập nhật mảng columnOrderIds của board chứa nó
  const moveColumn = (dndOrderedColumns) => {
    const dndOrderedColumnIds = dndOrderedColumns.map((c) => c._id)

    // setBoard()
    const newBoard = { ...board }
    newBoard.columns = dndOrderedColumns
    newBoard.columnOrderIds = dndOrderedColumnIds

    setBoard(newBoard)

    //call api to update boards
    updateBoardDetailAPI(newBoard._id, { columnOrderIds: dndOrderedColumnIds })
  }

  // khi di chuyển card trong cùng 1 column :
  // CHỉ cần call api để cập nhật mảng cardOrderIds của column chứa nó
  const moveCardInTheSameColumn = (dndOrderedCards, dndOrderedCardIds, columnId) => {
    //Update cho chuẩn dữ liệu state Board
    const newBoard = { ...board }
    const columnToUpdate = newBoard.columns.find((column) => column._id === columnId)
    if (columnToUpdate) {
      columnToUpdate.cards = dndOrderedCards
      columnToUpdate.cardOrderIds = dndOrderedCardIds
    }

    setBoard(newBoard)

    // Call api update Column
    updateColumnDetailAPI(columnId, { cardOrderIds: dndOrderedCardIds })
  }

  // B1: update cardOrderIds của column ban đầu chứa nó (xóa _id của card đó ra khỏi column)
  // B2: update cardOrderIds của column đích chứa nó (thêm _id của card đó vào column)
  // B3: update lại trường columnId của card đã kéo
  // => làm 1 api support riêng
  const moveCardToDifferentColumn = (
    currentCardId,
    prevColumnId,
    nextColumnId,
    dndOrderedColumns,
  ) => {
    const dndOrderedColumnIds = dndOrderedColumns.map((c) => c._id)

    // setBoard()
    const newBoard = { ...board }
    newBoard.columns = dndOrderedColumns
    newBoard.columnOrderIds = dndOrderedColumnIds

    setBoard(newBoard)

    let prevCardOrderIds = dndOrderedColumns.find((c) => c._id === prevColumnId)?.cardOrderIds

    // trường hợp keo card cuối cùng ra khỏi column tránh bug về phía BE (cần xóa placeholder-card trước khi gửi dữ liệu lên BE )
    if (prevCardOrderIds[0].includes('-placeholder-card')) prevCardOrderIds = []

    // call api
    moveCardToDifferentColumnAPI({
      currentCardId,
      prevColumnId,
      prevCardOrderIds,
      nextColumnId,
      nextCardOrderIds: dndOrderedColumns.find((c) => c._id === nextColumnId)?.cardOrderIds,
    })
  }

  //logic delete column and cards in this column
  const deleteColumnDetail = (columnId) => {
    // update cho chuan du lieu state Board UI
    const newBoard = { ...board }
    newBoard.columns = newBoard.columns.filter((c) => c._id !== columnId)
    newBoard.columnOrderIds = newBoard.columnOrderIds.filter((id) => id !== columnId)

    setBoard(newBoard)

    // call api
    deleteColumnDetailAPI(columnId).then((res) => {
      toast.success(res?.deleteResult)
    })
  }

  if (!board) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          width: '100vw',
          height: '100vh',
        }}
      >
        <CircularProgress />
        <Typography>Loading Board...</Typography>
      </Box>
    )
  }

  return (
    <Container disableGutters maxWidth={false} sx={{ height: '100vh' }}>
      <AppBar />

      <BoardBar board={board} />

      <BoardContent
        board={board}
        createNewColumn={createNewColumn}
        createNewCard={createNewCard}
        moveColumn={moveColumn}
        moveCardInTheSameColumn={moveCardInTheSameColumn}
        moveCardToDifferentColumn={moveCardToDifferentColumn}
        deleteColumnDetail={deleteColumnDetail}
      />
    </Container>
  )
}

export default Board
