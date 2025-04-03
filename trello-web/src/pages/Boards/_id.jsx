// Boards Details
import { Container } from '@mui/material' //quick custom css
import AppBar from '~/components/AppBar/AppBar'
import BoardBar from './BoardBar/BoardBar'
import BoardContent from './BoardContent/BoardContent'

// import { mockData } from '~/apis/mock-data'

import {
  fetchBoardDetailAPI,
  createNewColumnAPI,
  createNewCardAPI,
  updateBoardDetailAPI,
} from '~/apis'
import { generatePlaceholderCard } from '~/utils/formatters'
import { isEmpty } from 'lodash'

import { useEffect, useState } from 'react'

function Board() {
  const [board, setBoard] = useState(null)

  useEffect(() => {
    const boardId = '67eaab9ce0e49206521246ed'
    fetchBoardDetailAPI(boardId).then((boardData) => {
      // create card giữ chỗ để có thể kéo thả qua lại các column rỗng
      boardData.columns.forEach((column) => {
        if (isEmpty(column.cards)) {
          column.cards = [generatePlaceholderCard(column)]
          column.cardOrderIds = [generatePlaceholderCard(column)._id]
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
      columnToUpdate.cards.push(createdCard)
      columnToUpdate.cardOrderIds.push(createdCard._id)
    }

    setBoard(newBoard)
  }

  // Func xử lý gọi api xử lý sắp xếp khi kéo thả columns
  const moveColumn = async (dndOrderedColumn) => {
    const dndOrderedColumnIds = dndOrderedColumn.map((c) => c._id)

    // setBoard()
    const newBoard = { ...board }
    newBoard.columns = dndOrderedColumn
    newBoard.columnOrderIds = dndOrderedColumnIds

    setBoard(newBoard)

    //call api to update boards
    await updateBoardDetailAPI(newBoard._id, { columnOrderIds: dndOrderedColumnIds })
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
      />
    </Container>
  )
}

export default Board
