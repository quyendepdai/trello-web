import { useState } from 'react'
import { toast } from 'react-toastify'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import ContentCut from '@mui/icons-material/ContentCut'
import ContentCopy from '@mui/icons-material/ContentCopy'
import ContentPaste from '@mui/icons-material/ContentPaste'
import Cloud from '@mui/icons-material/Cloud'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Tooltip from '@mui/material/Tooltip'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import AddCardIcon from '@mui/icons-material/AddCard'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import ListCards from './ListCards/ListCards'
import { mapOrder } from '~/utils/sorts'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import TextField from '@mui/material/TextField'
import CloseIcon from '@mui/icons-material/Close'

function Column({ column, createNewCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column._id,
    data: { ...column },
  })

  const dndKitColumnStyles = {
    // touchAction : 'none',
    // nếu sử dụng CSS.Transform như docs sẽ bị lỗi kiểu stretch (méo column)
    transform: CSS.Translate.toString(transform),
    //Chiều cao phải luôn là 100% vì để tránh bug xảy ra khi các column có chiều cao khác nhau (video 32)
    // Lưu ý phải sử dụng kết hợp với {...listeners} nằm ở Box chứ ko phải Div tránh kéo vào vùng ko thuộc Box
    transition,
    height: '100%',
    opacity: isDragging ? 0.5 : undefined,
  }

  const orderedCards = mapOrder(column?.cards, column?.cardOrderIds, '_id')

  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const [openNewCardForm, setOpenNewCardForm] = useState(false)

  const toggleOpenNewCardForm = () => setOpenNewCardForm(!openNewCardForm)

  const [newCardTitle, setNewCardTitle] = useState('')

  const addNewCard = async () => {
    if (!newCardTitle) {
      toast.error('Please enter card title!', {
        position: 'bottom-right',
      })
      return
    }

    const newCardData = {
      title: newCardTitle,
      columnId: column._id,
    }

    // console.log(newCardTitle)
    // call API
    await createNewCard(newCardData)
    // reset form
    setNewCardTitle('')
    toggleOpenNewCardForm()
  }

  //Phải bọc Div ở đây để fix chiều cao các column như nhau tránh bug kéo thả
  return (
    <div ref={setNodeRef} style={dndKitColumnStyles} {...attributes}>
      <Box
        {...listeners}
        sx={{
          minWidth: '300px',
          maxWidth: '300px',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#333643' : '#ebecf0'),
          ml: 2,
          borderRadius: '6px',
          height: 'fit-content',
          maxHeight: (theme) => `calc(${theme.trello.boardContentHeight} 
                                        - ${theme.spacing(5)})`,
          border: isDragging ? '1px solid #2ecc71' : undefined,
        }}
      >
        {/* Header card */}
        <Box
          sx={{
            height: (theme) => theme.trello.columnHeaderHeight,
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
            {column?.title}
          </Typography>
          {/* Dropdown */}
          <Box>
            <Tooltip title="More Options">
              <ExpandMoreIcon
                sx={{ color: 'text.primary', cursor: 'pointer' }}
                id="basic-column-dropdown"
                aria-controls={open ? 'basic-menu-column-dropdown' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
              />
            </Tooltip>
            <Menu
              id="basic-menu-column-dropdown"
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              MenuListProps={{
                'aria-labelledby': 'basic-column-dropdown',
              }}
            >
              <MenuItem>
                <ListItemIcon>
                  <AddCardIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Add new card</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <ContentCut fontSize="small" />
                </ListItemIcon>
                <ListItemText>Cut</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <ContentCopy fontSize="small" />
                </ListItemIcon>
                <ListItemText>Copy</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <ContentPaste fontSize="small" />
                </ListItemIcon>
                <ListItemText>Paste</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem>
                <ListItemIcon>
                  <DeleteForeverIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Remove this column</ListItemText>
              </MenuItem>
              <MenuItem>
                <ListItemIcon>
                  <Cloud fontSize="small" />
                </ListItemIcon>
                <ListItemText>Archive this column</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* List card */}
        <ListCards cards={orderedCards} />

        {/* Footer card */}
        <Box
          sx={{
            height: (theme) => theme.trello.columnFooterHeight,
            p: 2,
          }}
        >
          {!openNewCardForm ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Button startIcon={<AddCardIcon />} onClick={toggleOpenNewCardForm}>
                Add new card
              </Button>
              <Tooltip title="Drag to move">
                <DragHandleIcon sx={{ cursor: 'pointer' }} />
              </Tooltip>
            </Box>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <TextField
                label="Enter card title"
                type="text"
                size="small"
                variant="outlined"
                autoFocus
                data-no-dnd="true"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                sx={{
                  '& label': { color: 'text.primary' },
                  '& input': {
                    color: (theme) => theme.palette.primary.main,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#333643' : 'white'),
                  },
                  '& label.Mui-focused': { color: (theme) => theme.palette.primary.main },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: (theme) => theme.palette.primary.main },
                    '&:hover fieldset': { borderColor: (theme) => theme.palette.primary.main },
                    '&.Mui-focused fieldset': {
                      borderColor: (theme) => theme.palette.primary.main,
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    borderRadius: 1,
                  },
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  onClick={addNewCard}
                  data-no-dnd="true"
                  variant="contained"
                  color="success"
                  size="small"
                  sx={{
                    boxShadow: 'none',
                    border: '0.5px solid',
                    borderColor: (theme) => theme.palette.success.main,
                    '&:hover': {
                      bgcolor: (theme) => theme.palette.success.main,
                    },
                  }}
                >
                  Add
                </Button>
                <CloseIcon
                  onClick={toggleOpenNewCardForm}
                  fontSize="small"
                  sx={{
                    cursor: 'pointer',
                    color: (theme) => theme.palette.warning.light,
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </div>
  )
}

export default Column
