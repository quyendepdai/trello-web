// Boards Details
import { Container } from '@mui/material' //quick custom css
import AppBar from '~/components/AppBar'
import BoardBar from './BoardBar'
import BoardContent from './BoardContent'

function Board() {
  return (
    <Container disableGutters maxWidth={false} sx={{ height: '100vh' }}>
      <AppBar />

      <BoardBar />

      <BoardContent />
    </Container>
  )
}

export default Board
